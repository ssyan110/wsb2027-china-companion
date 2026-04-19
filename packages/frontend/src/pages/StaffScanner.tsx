import { useEffect, useState, useCallback, useRef } from 'react';
import { getDb } from '../lib/db';
import { apiClient } from '../lib/api';
import { useAppStore } from '../stores/app.store';
import {
  validateScan,
  batchFamilyCheckIn,
  isValidOverrideReason,
  OVERRIDE_REASONS,
  type ScanValidationResult,
  type BatchCheckInResult,
} from '../lib/scan-validator';
import type { ManifestEntry, ManifestMeta, ScanLogEntry, ScanMode } from '@wsb/shared';

// ─── Helpers ─────────────────────────────────────────────────

const STALE_THRESHOLD_MS = 4 * 60 * 60 * 1000; // 4 hours

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getDeviceId(): string {
  let id = localStorage.getItem('wsb_device_id');
  if (!id) {
    id = generateId();
    localStorage.setItem('wsb_device_id', id);
  }
  return id;
}

// ─── Component ───────────────────────────────────────────────

export default function StaffScanner() {
  const isOnline = useAppStore((s) => s.isOnline);

  // Manifest state
  const [manifest, setManifest] = useState<Map<string, ManifestEntry>>(new Map());
  const [manifestMeta, setManifestMeta] = useState<ManifestMeta | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [manifestStale, setManifestStale] = useState(false);

  // Scan modes
  const [scanModes, setScanModes] = useState<ScanMode[]>([]);
  const [activeScanMode, setActiveScanMode] = useState<ScanMode | null>(null);

  // Scan state
  const [lastResult, setLastResult] = useState<ScanValidationResult | null>(null);
  const [scanCounts, setScanCounts] = useState({ total: 0, pass: 0, fail: 0 });
  const [qrInput, setQrInput] = useState('');

  // Batch mode
  const [batchMode, setBatchMode] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchCheckInResult | null>(null);

  // Override
  const [showOverride, setShowOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const overrideTokenRef = useRef('');

  // ─── Load manifest from IndexedDB on mount ─────────────────

  useEffect(() => {
    async function loadCached() {
      const db = await getDb();
      const meta = await db.get('manifestMeta', 'meta');
      if (meta) {
        setManifestMeta(meta);
        checkStale(meta.synced_at);
      }
      const all = await db.getAll('manifest');
      const map = new Map<string, ManifestEntry>();
      for (const entry of all) {
        map.set(entry.qr_token_value, entry);
      }
      setManifest(map);
    }
    loadCached();
  }, []);

  // ─── Load scan modes ───────────────────────────────────────

  useEffect(() => {
    async function loadModes() {
      try {
        const { modes } = await apiClient<{ modes: ScanMode[] }>('/api/v1/staff/scan-modes');
        setScanModes(modes);
        if (modes.length > 0 && !activeScanMode) {
          setActiveScanMode(modes[0]);
        }
      } catch {
        // offline — no modes available
      }
    }
    loadModes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function checkStale(syncedAt: string) {
    const age = Date.now() - new Date(syncedAt).getTime();
    setManifestStale(age > STALE_THRESHOLD_MS);
  }

  // ─── Manifest Sync ─────────────────────────────────────────

  const syncManifest = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncProgress(10);

    try {
      const db = await getDb();
      const currentMeta = await db.get('manifestMeta', 'meta');

      let travelers: ManifestEntry[];
      let version: string;

      if (currentMeta?.version) {
        // Delta sync
        setSyncProgress(30);
        const delta = await apiClient<{ travelers: ManifestEntry[]; version: string }>(
          `/api/v1/staff/manifest/delta?since_version=${currentMeta.version}`,
        );
        travelers = delta.travelers;
        version = delta.version;
      } else {
        // Full sync
        setSyncProgress(30);
        const full = await apiClient<{ travelers: ManifestEntry[]; version: string }>(
          '/api/v1/staff/manifest',
        );
        travelers = full.travelers;
        version = full.version;
      }

      setSyncProgress(60);

      // Store in IndexedDB
      const tx = db.transaction('manifest', 'readwrite');
      for (const entry of travelers) {
        await tx.store.put(entry);
      }
      await tx.done;

      setSyncProgress(80);

      // Update meta
      const newMeta: ManifestMeta = {
        version,
        synced_at: new Date().toISOString(),
        count: (await db.count('manifest')),
      };
      await db.put('manifestMeta', newMeta, 'meta');

      // Rebuild in-memory map
      const all = await db.getAll('manifest');
      const map = new Map<string, ManifestEntry>();
      for (const e of all) map.set(e.qr_token_value, e);
      setManifest(map);
      setManifestMeta(newMeta);
      setManifestStale(false);
      setSyncProgress(100);
    } catch {
      // sync failed — keep existing data
    } finally {
      setSyncing(false);
    }
  }, [syncing]);

  // ─── Upload scan queue when online ─────────────────────────

  useEffect(() => {
    if (!isOnline) return;
    async function upload() {
      const db = await getDb();
      const unsynced = await db.getAllFromIndex('scanQueue', 'by-synced', 0);
      if (unsynced.length === 0) return;
      const scans = unsynced.map(({ id: _id, synced: _synced, ...rest }) => rest);
      try {
        await apiClient('/api/v1/staff/scans/batch', {
          method: 'POST',
          body: JSON.stringify({ scans }),
        });
        const tx = db.transaction('scanQueue', 'readwrite');
        for (const entry of unsynced) {
          await tx.store.put({ ...entry, synced: 1 as const });
        }
        await tx.done;
      } catch {
        // will retry next time
      }
    }
    upload();
  }, [isOnline]);

  // ─── Sound helpers ─────────────────────────────────────────

  function playSound(type: 'pass' | 'fail') {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = type === 'pass' ? 880 : 300;
      osc.type = type === 'pass' ? 'sine' : 'square';
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + (type === 'pass' ? 0.15 : 0.3));
    } catch {
      // Audio not available
    }
  }

  // ─── Record scan to IndexedDB queue ────────────────────────

  async function recordScan(
    qrToken: string,
    result: ScanLogEntry['result'],
    overrideReasonCode?: string,
  ) {
    if (!activeScanMode) return;
    const entry: ScanLogEntry = {
      id: generateId(),
      qr_token_value: qrToken,
      scan_mode: activeScanMode.mode_id,
      result,
      device_id: getDeviceId(),
      scanned_at: new Date().toISOString(),
      synced: 0,
    };
    if (overrideReasonCode) entry.override_reason = overrideReasonCode;
    const db = await getDb();
    await db.put('scanQueue', entry);
  }

  // ─── Handle scan ───────────────────────────────────────────

  const handleScan = useCallback(
    async (token: string) => {
      if (!activeScanMode || !token.trim()) return;

      if (batchMode) {
        const batch = batchFamilyCheckIn(token, activeScanMode.mode_id, manifest);
        if (batch) {
          setBatchResult(batch);
          return;
        }
        // Fall through to single scan if not a family rep
      }

      const result = validateScan(token, activeScanMode.mode_id, manifest);
      setLastResult(result);

      if (result.result === 'pass') {
        playSound('pass');
        await recordScan(token, 'pass');
        setScanCounts((c) => ({ total: c.total + 1, pass: c.pass + 1, fail: c.fail }));
      } else {
        playSound('fail');
        const scanResult = result.result === 'wrong_assignment' ? 'wrong_assignment' : 'fail';
        await recordScan(token, scanResult);
        setScanCounts((c) => ({ total: c.total + 1, pass: c.pass, fail: c.fail + 1 }));
        overrideTokenRef.current = token;
      }

      setQrInput('');
    },
    [activeScanMode, batchMode, manifest],
  );

  // ─── Batch confirm ─────────────────────────────────────────

  async function confirmBatchCheckIn() {
    if (!batchResult || !activeScanMode) return;
    for (const m of batchResult.members) {
      if (m.eligible) {
        await recordScan(m.traveler.qr_token_value, 'pass');
      }
    }
    setScanCounts((c) => ({
      total: c.total + batchResult.members.length,
      pass: c.pass + batchResult.eligibleCount,
      fail: c.fail + (batchResult.totalCount - batchResult.eligibleCount),
    }));
    playSound('pass');
    setBatchResult(null);
  }

  // ─── Override handler ──────────────────────────────────────

  async function submitOverride() {
    if (!isValidOverrideReason(overrideReason)) return;
    await recordScan(overrideTokenRef.current, 'override', overrideReason);
    setScanCounts((c) => ({ total: c.total, pass: c.pass + 1, fail: c.fail - 1 }));
    setShowOverride(false);
    setOverrideReason('');
    setLastResult(null);
  }

  // ─── Render ────────────────────────────────────────────────

  return (
    <div className="scanner-page" data-testid="staff-scanner">
      {/* Header bar with active scan mode */}
      <div className="scanner-header" role="banner">
        <h1 className="scanner-mode-label" aria-live="polite">
          {activeScanMode ? `Mode: ${activeScanMode.name}` : 'No Mode Selected'}
        </h1>
        <div className="scanner-header-actions">
          <label className="scanner-batch-toggle" aria-label="Toggle batch family mode">
            <input
              type="checkbox"
              checked={batchMode}
              onChange={(e) => { setBatchMode(e.target.checked); setBatchResult(null); }}
            />
            Batch Family
          </label>
          <button
            className="scanner-sync-btn"
            onClick={syncManifest}
            disabled={syncing || !isOnline}
            aria-label="Sync manifest"
          >
            {syncing ? `Syncing ${syncProgress}%` : '🔄 Sync'}
          </button>
        </div>
      </div>

      {/* Stale manifest warning */}
      {manifestStale && (
        <div className="scanner-stale-warning" role="alert">
          ⚠️ Manifest is over 4 hours old.{' '}
          <button onClick={syncManifest} disabled={syncing || !isOnline}>Re-sync now</button>
        </div>
      )}

      {/* Manifest info */}
      {manifestMeta && (
        <div className="scanner-manifest-info" aria-label="Manifest status">
          {manifestMeta.count} travelers loaded · Last sync:{' '}
          {new Date(manifestMeta.synced_at).toLocaleTimeString()}
        </div>
      )}

      {/* Scan mode selector */}
      {scanModes.length > 1 && (
        <div className="scanner-mode-selector">
          <label htmlFor="scan-mode-select">Change Mode:</label>
          <select
            id="scan-mode-select"
            value={activeScanMode?.mode_id ?? ''}
            onChange={(e) => {
              const mode = scanModes.find((m) => m.mode_id === e.target.value);
              if (mode) setActiveScanMode(mode);
            }}
          >
            {scanModes.map((m) => (
              <option key={m.mode_id} value={m.mode_id}>{m.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Camera viewfinder placeholder */}
      <div
        className="scanner-viewfinder"
        role="img"
        aria-label="Camera viewfinder for QR scanning"
        style={{
          width: '60%',
          aspectRatio: '1',
          margin: '16px auto',
          border: '3px dashed var(--color-muted)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f9fafb',
        }}
      >
        <span style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>📷 Camera Viewfinder</span>
      </div>

      {/* Manual QR input for testing */}
      <div className="scanner-input-row" style={{ display: 'flex', gap: '8px', margin: '0 auto', maxWidth: '60%' }}>
        <input
          type="text"
          className="login-input"
          placeholder="Enter QR token…"
          value={qrInput}
          onChange={(e) => setQrInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleScan(qrInput); }}
          aria-label="QR token input"
        />
        <button
          className="login-btn login-btn-primary"
          style={{ width: 'auto', padding: '8px 16px' }}
          onClick={() => handleScan(qrInput)}
          disabled={!activeScanMode}
          aria-label="Submit scan"
        >
          Scan
        </button>
      </div>

      {/* Scan counter */}
      <div className="scanner-counters" aria-label="Scan statistics" style={{ display: 'flex', justifyContent: 'center', gap: '16px', margin: '12px 0', fontWeight: 600 }}>
        <span>Total: {scanCounts.total}</span>
        <span style={{ color: '#16a34a' }}>Pass: {scanCounts.pass}</span>
        <span style={{ color: 'var(--color-accent)' }}>Fail: {scanCounts.fail}</span>
      </div>

      {/* Result overlays */}
      {lastResult && !showOverride && !batchResult && (
        <div
          className={`scanner-result ${lastResult.result === 'pass' ? 'scanner-result-pass' : 'scanner-result-fail'}`}
          role="alert"
          aria-live="assertive"
          style={{
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            margin: '12px auto',
            maxWidth: '80%',
            background: lastResult.result === 'pass' ? '#dcfce7' : '#fee2e2',
            border: `2px solid ${lastResult.result === 'pass' ? '#16a34a' : '#dc2626'}`,
          }}
        >
          {lastResult.result === 'pass' && (
            <>
              <div style={{ fontSize: '2rem' }}>✅</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#16a34a' }}>
                {lastResult.traveler.full_name}
              </div>
              <div style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>Eligible — Checked In</div>
            </>
          )}
          {lastResult.result === 'fail' && (
            <>
              <div style={{ fontSize: '2rem' }}>❌</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#dc2626' }}>Unknown QR</div>
              <div style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>Contact Staff</div>
            </>
          )}
          {lastResult.result === 'wrong_assignment' && (
            <>
              <div style={{ fontSize: '2rem' }}>⛔</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#dc2626' }}>WRONG ASSIGNMENT</div>
              <div style={{ fontSize: '0.9rem' }}>{lastResult.traveler.full_name}</div>
              <div style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>
                Not eligible for this scan mode
              </div>
            </>
          )}
          {(lastResult.result === 'fail' || lastResult.result === 'wrong_assignment') && (
            <button
              className="login-btn login-btn-secondary"
              style={{ marginTop: '12px', width: 'auto', padding: '8px 20px' }}
              onClick={() => setShowOverride(true)}
              aria-label="Override rejection"
            >
              Override
            </button>
          )}
          <button
            className="login-btn"
            style={{ marginTop: '8px', width: 'auto', padding: '8px 20px', background: 'transparent', color: 'var(--color-muted)' }}
            onClick={() => setLastResult(null)}
            aria-label="Dismiss result"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Override flow */}
      {showOverride && (
        <div
          className="scanner-override"
          role="dialog"
          aria-label="Override reason selection"
          style={{
            padding: '20px',
            borderRadius: '12px',
            border: '2px solid var(--color-border)',
            margin: '12px auto',
            maxWidth: '80%',
            background: '#fff',
          }}
        >
          <h2 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Select Override Reason</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {OVERRIDE_REASONS.map((reason) => (
              <label key={reason} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="override-reason"
                  value={reason}
                  checked={overrideReason === reason}
                  onChange={() => setOverrideReason(reason)}
                />
                {reason}
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button
              className="login-btn login-btn-primary"
              style={{ width: 'auto', padding: '8px 20px' }}
              onClick={submitOverride}
              disabled={!isValidOverrideReason(overrideReason)}
              aria-label="Confirm override"
            >
              Confirm Override
            </button>
            <button
              className="login-btn login-btn-secondary"
              style={{ width: 'auto', padding: '8px 20px' }}
              onClick={() => { setShowOverride(false); setOverrideReason(''); }}
              aria-label="Cancel override"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Batch family check-in */}
      {batchResult && (
        <div
          className="scanner-batch"
          role="region"
          aria-label="Batch family check-in"
          style={{
            padding: '20px',
            borderRadius: '12px',
            border: '2px solid var(--color-border)',
            margin: '12px auto',
            maxWidth: '90%',
            background: '#fff',
          }}
        >
          <h2 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>
            Family Check-In ({batchResult.eligibleCount} of {batchResult.totalCount} eligible)
          </h2>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {batchResult.members.map((m) => (
              <li
                key={m.traveler.traveler_id}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: m.eligible ? '#16a34a' : '#dc2626',
                  background: m.eligible ? '#dcfce7' : '#fee2e2',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontWeight: 600 }}>{m.traveler.full_name}</span>
                <span style={{ fontSize: '0.85rem' }}>
                  {m.eligible ? '✅ Eligible' : '❌ Ineligible'}
                </span>
              </li>
            ))}
          </ul>
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button
              className="login-btn login-btn-primary"
              style={{ width: 'auto', padding: '8px 20px' }}
              onClick={confirmBatchCheckIn}
              aria-label="Confirm batch check-in"
            >
              Confirm Check-In
            </button>
            <button
              className="login-btn login-btn-secondary"
              style={{ width: 'auto', padding: '8px 20px' }}
              onClick={() => setBatchResult(null)}
              aria-label="Cancel batch check-in"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
