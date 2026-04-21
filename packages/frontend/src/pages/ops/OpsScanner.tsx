import { useState, useEffect, useRef, useCallback } from 'react';
import { useOpsPanelStore } from '../../stores/ops-panel.store';
import type { ExtendedMasterListRow, EventAttendanceItem } from '@wsb/shared';

// ─── Types ───────────────────────────────────────────────────

type ScanStatus = 'pass' | 'already' | 'wrong_fleet' | 'invalid' | 'not_assigned';
type AppMode = 'setup' | 'scanning' | 'manual-search';

interface ScanResult {
  status: ScanStatus;
  traveler?: ExtendedMasterListRow;
  message: string;
  correctFleet?: string;
}

interface ScanHistoryEntry {
  id: string;
  timestamp: string;
  travelerName: string | null;
  status: ScanStatus;
  message: string;
}

// ─── Status config ───────────────────────────────────────────

const STATUS_CONFIG: Record<ScanStatus, { bg: string; border: string; color: string; icon: string; label: string }> = {
  pass:         { bg: '#dcfce7', border: '#16a34a', color: '#15803d', icon: '✅', label: 'Checked In' },
  already:      { bg: '#dbeafe', border: '#2563eb', color: '#1d4ed8', icon: 'ℹ️', label: 'Already Scanned' },
  wrong_fleet:  { bg: '#fef9c3', border: '#ca8a04', color: '#a16207', icon: '⚠️', label: 'Wrong Fleet' },
  invalid:      { bg: '#fee2e2', border: '#dc2626', color: '#b91c1c', icon: '❌', label: 'Not Found' },
  not_assigned: { bg: '#fee2e2', border: '#dc2626', color: '#b91c1c', icon: '❌', label: 'Not Assigned' },
};

const AUTO_CLEAR_MS = 5000;
const MAX_HISTORY = 50;

// ─── Component ───────────────────────────────────────────────

export function OpsScanner() {
  const data = useOpsPanelStore((s) => s.data);
  const fetchData = useOpsPanelStore((s) => s.fetchData);

  const [mode, setMode] = useState<AppMode>('setup');
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedFleet, setSelectedFleet] = useState('');

  // Camera scanning
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Manual search
  const [searchFirst, setSearchFirst] = useState('');
  const [searchLast, setSearchLast] = useState('');
  const [searchResults, setSearchResults] = useState<ExtendedMasterListRow[]>([]);
  const [disambiguateYear, setDisambiguateYear] = useState('');
  const [showDisambiguate, setShowDisambiguate] = useState(false);
  const [disambiguateCandidates, setDisambiguateCandidates] = useState<ExtendedMasterListRow[]>([]);

  // Result
  const [result, setResult] = useState<ScanResult | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // History
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);
  const scannedSetRef = useRef<Set<string>>(new Set());

  // Extract unique event names + fleet numbers
  const eventNames = Array.from(
    new Set(data.flatMap((r) => (r.event_attendance ?? []).map((e: EventAttendanceItem) => e.event_name))),
  ).sort();

  const fleetNumbers = Array.from(
    new Set(data.flatMap((r) => (r.event_attendance ?? []).map((e: EventAttendanceItem) => e.fleet_number).filter(Boolean))),
  ).sort() as string[];

  useEffect(() => { if (data.length === 0) fetchData(); }, [data.length, fetchData]);

  // ─── Process scan result ───────────────────────────────────

  const processTraveler = useCallback((traveler: ExtendedMasterListRow) => {
    let scanResult: ScanResult;

    if (selectedSession === 'hotel-checkin') {
      const scanKey = `hotel:${traveler.traveler_id}`;
      if (scannedSetRef.current.has(scanKey)) {
        scanResult = { status: 'already', traveler, message: 'Already scanned for hotel check-in' };
      } else {
        scannedSetRef.current.add(scanKey);
        scanResult = { status: 'pass', traveler, message: 'Hotel check-in successful' };
      }
    } else {
      const ea = (traveler.event_attendance ?? []).find((e: EventAttendanceItem) => e.event_name === selectedSession);
      if (!ea) {
        scanResult = { status: 'not_assigned', traveler, message: `Not assigned to ${selectedSession}` };
      } else {
        const scanKey = `${selectedSession}:${traveler.traveler_id}`;
        if (scannedSetRef.current.has(scanKey)) {
          scanResult = { status: 'already', traveler, message: `Already scanned for ${selectedSession}` };
        } else if (selectedFleet && ea.fleet_number && ea.fleet_number !== selectedFleet) {
          scannedSetRef.current.add(scanKey);
          scanResult = { status: 'wrong_fleet', traveler, message: `Wrong fleet — assigned to ${ea.fleet_number}`, correctFleet: ea.fleet_number };
        } else {
          scannedSetRef.current.add(scanKey);
          scanResult = { status: 'pass', traveler, message: 'Checked in successfully' };
        }
      }
    }

    setResult(scanResult);
    setHistory((prev) => [{
      id: `${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      travelerName: `${traveler.first_name ?? ''} ${traveler.last_name ?? ''}`.trim() || traveler.full_name_raw,
      status: scanResult.status,
      message: scanResult.message,
    }, ...prev].slice(0, MAX_HISTORY));

    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    clearTimerRef.current = setTimeout(() => setResult(null), AUTO_CLEAR_MS);
  }, [selectedSession, selectedFleet]);

  // ─── QR scan from camera ───────────────────────────────────

  const processQrValue = useCallback((qrValue: string) => {
    const trimmed = qrValue.trim();
    // Look up by booking_id or QR token value
    const traveler = data.find((r) => r.booking_id === trimmed || r.traveler_id === trimmed);
    if (!traveler) {
      setResult({ status: 'invalid', message: `No traveler found for: ${trimmed}` });
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      clearTimerRef.current = setTimeout(() => setResult(null), AUTO_CLEAR_MS);
      return;
    }
    processTraveler(traveler);
  }, [data, processTraveler]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      scanningRef.current = true;
      scanLoop();
    } catch (err) {
      setCameraError('Camera access denied. Use manual search below.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const scanLoop = useCallback(() => {
    if (!scanningRef.current || !videoRef.current) return;

    const video = videoRef.current;
    if (video.readyState < 2) {
      requestAnimationFrame(scanLoop);
      return;
    }

    // Use BarcodeDetector if available (Chrome/Edge Android)
    if ('BarcodeDetector' in window) {
      const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      detector.detect(video).then((barcodes: any[]) => {
        if (barcodes.length > 0 && scanningRef.current) {
          const value = barcodes[0].rawValue;
          scanningRef.current = false; // pause scanning
          processQrValue(value);
          // Resume scanning after result clears
          setTimeout(() => { scanningRef.current = true; scanLoop(); }, AUTO_CLEAR_MS + 500);
        } else if (scanningRef.current) {
          requestAnimationFrame(scanLoop);
        }
      }).catch(() => {
        if (scanningRef.current) requestAnimationFrame(scanLoop);
      });
    } else {
      // No BarcodeDetector — show fallback message
      setCameraError('QR scanning not supported on this browser. Use manual search.');
      stopCamera();
    }
  }, [processQrValue, stopCamera]);

  // Start scanning when entering scan mode
  useEffect(() => {
    if (mode === 'scanning') {
      startCamera();
    }
    return () => { stopCamera(); };
  }, [mode, startCamera, stopCamera]);

  // ─── Manual search ─────────────────────────────────────────

  const handleManualSearch = useCallback(() => {
    const first = searchFirst.trim().toLowerCase();
    const last = searchLast.trim().toLowerCase();
    if (!first && !last) return;

    const matches = data.filter((r) => {
      const fn = (r.first_name ?? '').toLowerCase();
      const ln = (r.last_name ?? '').toLowerCase();
      return (first ? fn.includes(first) : true) && (last ? ln.includes(last) : true);
    });

    if (matches.length === 0) {
      setResult({ status: 'invalid', message: 'No traveler found with that name' });
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      clearTimerRef.current = setTimeout(() => setResult(null), AUTO_CLEAR_MS);
    } else if (matches.length === 1) {
      processTraveler(matches[0]);
      setSearchFirst(''); setSearchLast('');
    } else {
      // Check if names are identical (need disambiguation)
      const exactMatches = matches.filter((r) =>
        (r.first_name ?? '').toLowerCase() === first && (r.last_name ?? '').toLowerCase() === last
      );
      if (exactMatches.length > 1) {
        setDisambiguateCandidates(exactMatches);
        setShowDisambiguate(true);
      } else {
        // Show filtered results (no personal info)
        setSearchResults(matches.slice(0, 10));
      }
    }
  }, [searchFirst, searchLast, data, processTraveler]);

  const handleDisambiguate = useCallback(() => {
    const year = parseInt(disambiguateYear, 10);
    if (!year) return;
    const match = disambiguateCandidates.find((r) => {
      const birthYear = r.age ? new Date().getFullYear() - r.age : null;
      return birthYear === year;
    });
    if (match) {
      processTraveler(match);
      setShowDisambiguate(false);
      setDisambiguateYear('');
      setSearchFirst(''); setSearchLast('');
    } else {
      setResult({ status: 'invalid', message: 'No match for that birth year' });
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      clearTimerRef.current = setTimeout(() => setResult(null), AUTO_CLEAR_MS);
    }
  }, [disambiguateYear, disambiguateCandidates, processTraveler]);

  // ─── Render: Setup screen ──────────────────────────────────

  if (mode === 'setup') {
    return (
      <div style={{ padding: '1.5rem', maxWidth: 500, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📷</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>QR Scanner</h1>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>Select session and fleet before scanning</p>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            Session *
          </label>
          <select
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', borderRadius: 8, border: '2px solid #e0e0e0' }}
          >
            <option value="">— Select session —</option>
            <option value="hotel-checkin">🏨 Hotel Check-in</option>
            {eventNames.map((name) => <option key={name} value={name}>📅 {name}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            Fleet {selectedSession !== 'hotel-checkin' ? '*' : '(optional)'}
          </label>
          <select
            value={selectedFleet}
            onChange={(e) => setSelectedFleet(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', borderRadius: 8, border: '2px solid #e0e0e0' }}
          >
            <option value="">— All fleets —</option>
            {fleetNumbers.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        <button
          disabled={!selectedSession}
          onClick={() => setMode('scanning')}
          style={{
            width: '100%', padding: '1rem', fontSize: '1.2rem', fontWeight: 700,
            borderRadius: 12, border: 'none', color: '#fff', cursor: selectedSession ? 'pointer' : 'not-allowed',
            background: selectedSession ? '#16a34a' : '#ccc',
          }}
        >
          📷 Start Scanning
        </button>
      </div>
    );
  }

  // ─── Render: Scanning / Manual search ──────────────────────

  const cfg = result ? STATUS_CONFIG[result.status] : null;

  return (
    <div style={{ padding: '1rem', maxWidth: 700, margin: '0 auto' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
            {selectedSession === 'hotel-checkin' ? '🏨 Hotel Check-in' : `📅 ${selectedSession}`}
          </span>
          {selectedFleet && <span style={{ marginLeft: '0.5rem', color: '#666', fontSize: '0.85rem' }}>· {selectedFleet}</span>}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => { setMode(mode === 'scanning' ? 'manual-search' : 'scanning'); setSearchResults([]); }}
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}
          >
            {mode === 'scanning' ? '🔍 Manual Search' : '📷 Camera'}
          </button>
          <button
            onClick={() => { stopCamera(); setMode('setup'); setResult(null); }}
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}
          >
            ⚙️ Change Session
          </button>
        </div>
      </div>

      {/* Result card (overlays everything when shown) */}
      {result && cfg && (
        <div
          role="alert"
          onClick={() => { setResult(null); }}
          style={{
            padding: '1.5rem', borderRadius: 16, textAlign: 'center', marginBottom: '1rem',
            cursor: 'pointer', background: cfg.bg, border: `3px solid ${cfg.border}`,
          }}
        >
          <div style={{ fontSize: '2.5rem' }}>{cfg.icon}</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: cfg.color, marginTop: '0.25rem' }}>{cfg.label}</div>
          <div style={{ fontSize: '0.95rem', color: '#374151', marginTop: '0.25rem' }}>{result.message}</div>
          {result.traveler && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#4b5563' }}>
              <strong>{result.traveler.first_name} {result.traveler.last_name}</strong>
              {result.traveler.room_assignment?.hotel_name && <span> · {result.traveler.room_assignment.hotel_name}</span>}
              {result.correctFleet && <span> · Correct: <strong>{result.correctFleet}</strong></span>}
            </div>
          )}
          <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#9ca3af' }}>Tap to dismiss</div>
        </div>
      )}

      {/* Camera view */}
      {mode === 'scanning' && (
        <div style={{ marginBottom: '1rem' }}>
          {cameraError ? (
            <div style={{ padding: '2rem', textAlign: 'center', background: '#fef2f2', borderRadius: 12, border: '1px solid #fecaca' }}>
              <p style={{ color: '#dc2626', fontWeight: 600, marginBottom: '0.5rem' }}>📷 {cameraError}</p>
              <button
                onClick={() => setMode('manual-search')}
                style={{ padding: '0.5rem 1rem', borderRadius: 6, border: 'none', background: '#6366f1', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
              >
                Use Manual Search
              </button>
            </div>
          ) : (
            <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000' }}>
              <video
                ref={videoRef}
                playsInline
                muted
                style={{ width: '100%', display: 'block', maxHeight: 350 }}
              />
              <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                width: 200, height: 200, border: '3px solid rgba(255,255,255,0.6)', borderRadius: 16,
                pointerEvents: 'none',
              }} />
              <div style={{
                position: 'absolute', bottom: 8, left: 0, right: 0, textAlign: 'center',
                color: '#fff', fontSize: '0.8rem', textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              }}>
                Point camera at traveler's QR code
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual search */}
      {mode === 'manual-search' && (
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.75rem' }}>
            Enter traveler's first and last name to search.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input
              placeholder="First name"
              value={searchFirst}
              onChange={(e) => setSearchFirst(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
              autoFocus
              style={{ flex: 1, padding: '0.6rem', fontSize: '1rem', borderRadius: 8, border: '1px solid #ccc' }}
            />
            <input
              placeholder="Last name"
              value={searchLast}
              onChange={(e) => setSearchLast(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
              style={{ flex: 1, padding: '0.6rem', fontSize: '1rem', borderRadius: 8, border: '1px solid #ccc' }}
            />
            <button
              onClick={handleManualSearch}
              style={{ padding: '0.6rem 1rem', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
            >
              Search
            </button>
          </div>

          {/* Search results — no personal info shown */}
          {searchResults.length > 0 && (
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
              {searchResults.map((r) => (
                <button
                  key={r.traveler_id}
                  onClick={() => { processTraveler(r); setSearchResults([]); setSearchFirst(''); setSearchLast(''); }}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    width: '100%', padding: '0.75rem 1rem', border: 'none', borderBottom: '1px solid #f3f4f6',
                    background: '#fff', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{r.first_name} {r.last_name}</span>
                  <span style={{ fontSize: '0.8rem', color: '#666' }}>{r.groups?.[0] ?? ''}</span>
                </button>
              ))}
            </div>
          )}

          {/* Disambiguation by birth year */}
          {showDisambiguate && (
            <div style={{ padding: '1rem', background: '#fffbeb', border: '1px solid #fbbf24', borderRadius: 8, marginTop: '0.5rem' }}>
              <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                Multiple travelers with the same name found. Enter birth year to identify:
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  placeholder="Birth year (e.g. 1985)"
                  value={disambiguateYear}
                  onChange={(e) => setDisambiguateYear(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleDisambiguate()}
                  autoFocus
                  type="number"
                  min="1920" max="2025"
                  style={{ flex: 1, padding: '0.5rem', fontSize: '1rem', borderRadius: 6, border: '1px solid #ccc' }}
                />
                <button
                  onClick={handleDisambiguate}
                  style={{ padding: '0.5rem 1rem', borderRadius: 6, border: 'none', background: '#f59e0b', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  Confirm
                </button>
                <button
                  onClick={() => { setShowDisambiguate(false); setDisambiguateYear(''); }}
                  style={{ padding: '0.5rem 0.75rem', borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scan history */}
      {history.length > 0 && (
        <div>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.4rem', color: '#374151' }}>
            Recent ({history.length})
          </h3>
          <div style={{ maxHeight: 250, overflowY: 'auto', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '0.8rem' }}>
            {history.map((h) => {
              const hCfg = STATUS_CONFIG[h.status];
              return (
                <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ color: '#999', minWidth: 55 }}>{h.timestamp}</span>
                  <span style={{ flex: 1, fontWeight: 500 }}>{h.travelerName ?? '—'}</span>
                  <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600, background: hCfg.bg, color: hCfg.color }}>
                    {hCfg.icon} {hCfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default OpsScanner;
