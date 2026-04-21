import { useState, useEffect, useRef, useCallback } from 'react';
import { useOpsPanelStore } from '../../stores/ops-panel.store';
import { apiClient } from '../../lib/api';
import type { ExtendedMasterListRow, EventAttendanceItem } from '@wsb/shared';

// jsQR loaded from CDN in index.html
declare function jsQR(data: Uint8ClampedArray, width: number, height: number): { data: string } | null;

type ScanStatus = 'pass' | 'already' | 'wrong_fleet' | 'invalid' | 'not_assigned' | 'revoked';
type AppMode = 'setup' | 'scanning' | 'manual-search';

interface ScanResult {
  status: ScanStatus;
  traveler?: ExtendedMasterListRow;
  message: string;
  correctFleet?: string;
}

interface QrMapEntry {
  token_value: string;
  traveler_id: string;
  booking_id: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface HistoryEntry {
  id: string;
  time: string;
  name: string | null;
  status: ScanStatus;
  message: string;
}

const STATUS = {
  pass:         { bg: '#dcfce7', border: '#16a34a', color: '#15803d', icon: '✅', label: 'Checked In' },
  already:      { bg: '#dbeafe', border: '#2563eb', color: '#1d4ed8', icon: 'ℹ️', label: 'Already Scanned' },
  wrong_fleet:  { bg: '#fef9c3', border: '#ca8a04', color: '#a16207', icon: '⚠️', label: 'Wrong Fleet' },
  invalid:      { bg: '#fee2e2', border: '#dc2626', color: '#b91c1c', icon: '❌', label: 'Not Found' },
  not_assigned: { bg: '#fee2e2', border: '#dc2626', color: '#b91c1c', icon: '❌', label: 'Not Assigned' },
  revoked:      { bg: '#fee2e2', border: '#dc2626', color: '#b91c1c', icon: '🚫', label: 'Token Revoked' },
} as const;

const CLEAR_MS = 4000;

export function OpsScanner() {
  const data = useOpsPanelStore((s) => s.data);
  const fetchData = useOpsPanelStore((s) => s.fetchData);

  const [mode, setMode] = useState<AppMode>('setup');
  const [session, setSession] = useState('');
  const [fleet, setFleet] = useState('');

  // QR token map: token_value → traveler_id
  const [qrMap, setQrMap] = useState<Map<string, QrMapEntry>>(new Map());
  const [qrMapLoading, setQrMapLoading] = useState(false);

  // Camera
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number>(0);
  const pausedRef = useRef(false);
  const [camErr, setCamErr] = useState<string | null>(null);

  // Manual search
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [results, setResults] = useState<ExtendedMasterListRow[]>([]);
  const [disambig, setDisambig] = useState<ExtendedMasterListRow[] | null>(null);
  const [birthYear, setBirthYear] = useState('');

  // Result + wrong fleet prompt
  const [result, setResult] = useState<ScanResult | null>(null);
  const [wrongFleetTraveler, setWrongFleetTraveler] = useState<ExtendedMasterListRow | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const scannedRef = useRef<Set<string>>(new Set());
  const clearRef = useRef<ReturnType<typeof setTimeout>>();

  const events = Array.from(new Set(data.flatMap((r) => (r.event_attendance ?? []).map((e: EventAttendanceItem) => e.event_name)))).sort();
  const fleets = Array.from(new Set(data.flatMap((r) => (r.event_attendance ?? []).map((e: EventAttendanceItem) => e.fleet_number).filter(Boolean)))).sort() as string[];

  // Load data + QR map
  useEffect(() => { if (data.length === 0) fetchData(); }, [data.length, fetchData]);

  const loadQrMap = useCallback(async () => {
    setQrMapLoading(true);
    try {
      const res = await apiClient<{ tokens: QrMapEntry[] }>('/api/v1/admin/qr-map');
      const map = new Map<string, QrMapEntry>();
      for (const t of res.tokens) map.set(t.token_value, t);
      setQrMap(map);
    } catch { /* will fall back to booking_id lookup */ }
    setQrMapLoading(false);
  }, []);

  useEffect(() => { loadQrMap(); }, [loadQrMap]);

  // ─── Add to history ────────────────────────────────────────

  const addHistory = useCallback((name: string | null, status: ScanStatus, message: string) => {
    setHistory((h) => [{ id: `${Date.now()}`, time: new Date().toLocaleTimeString(), name, status, message }, ...h].slice(0, 50));
  }, []);

  // ─── Check-in logic ────────────────────────────────────────

  const checkIn = useCallback((t: ExtendedMasterListRow, forceFleet = false) => {
    const tName = `${t.first_name ?? ''} ${t.last_name ?? ''}`.trim() || t.full_name_raw;
    let r: ScanResult;

    if (session === 'hotel-checkin') {
      const k = `hotel:${t.traveler_id}`;
      if (scannedRef.current.has(k)) {
        r = { status: 'already', traveler: t, message: 'Already scanned' };
      } else {
        scannedRef.current.add(k);
        r = { status: 'pass', traveler: t, message: 'Hotel check-in OK' };
      }
    } else {
      const ea = (t.event_attendance ?? []).find((e: EventAttendanceItem) => e.event_name === session);
      if (!ea) {
        r = { status: 'not_assigned', traveler: t, message: `Not on ${session} list` };
      } else {
        const k = `${session}:${t.traveler_id}`;
        if (scannedRef.current.has(k)) {
          r = { status: 'already', traveler: t, message: 'Already scanned' };
        } else if (!forceFleet && fleet && ea.fleet_number && ea.fleet_number !== fleet) {
          // Wrong fleet — show prompt instead of auto-clearing
          r = { status: 'wrong_fleet', traveler: t, message: `Assigned to ${ea.fleet_number}, not ${fleet}`, correctFleet: ea.fleet_number };
          setResult(r);
          setWrongFleetTraveler(t);
          addHistory(tName, 'wrong_fleet', r.message);
          return; // Don't auto-clear — wait for user decision
        } else {
          scannedRef.current.add(k);
          r = { status: 'pass', traveler: t, message: forceFleet ? 'Force checked in (wrong fleet override)' : 'Checked in ✓' };
        }
      }
    }

    setResult(r);
    setWrongFleetTraveler(null);
    addHistory(tName, r.status, r.message);
    if (clearRef.current) clearTimeout(clearRef.current);
    clearRef.current = setTimeout(() => { setResult(null); pausedRef.current = false; }, CLEAR_MS);
  }, [session, fleet, addHistory]);

  // Wrong fleet actions
  const handleForceCheckIn = useCallback(() => {
    if (wrongFleetTraveler) {
      checkIn(wrongFleetTraveler, true);
    }
  }, [wrongFleetTraveler, checkIn]);

  const handleDenyCheckIn = useCallback(() => {
    const tName = wrongFleetTraveler ? `${wrongFleetTraveler.first_name ?? ''} ${wrongFleetTraveler.last_name ?? ''}`.trim() : null;
    addHistory(tName, 'wrong_fleet', 'Denied — wrong fleet');
    setResult(null);
    setWrongFleetTraveler(null);
    pausedRef.current = false;
  }, [wrongFleetTraveler, addHistory]);

  // ─── QR decode ─────────────────────────────────────────────

  const onQrDetected = useCallback((val: string) => {
    pausedRef.current = true;

    // 1. Try QR token map (primary lookup)
    const qrEntry = qrMap.get(val);
    if (qrEntry) {
      const t = data.find((r) => r.traveler_id === qrEntry.traveler_id);
      if (t) { checkIn(t); return; }
    }

    // 2. Try booking_id
    const byBooking = data.find((r) => r.booking_id === val);
    if (byBooking) { checkIn(byBooking); return; }

    // 3. Try traveler_id
    const byId = data.find((r) => r.traveler_id === val);
    if (byId) { checkIn(byId); return; }

    // 4. Not found — check if revoked token via API
    apiClient<{ status: string }>('/api/v1/admin/scan-verify', {
      method: 'POST', body: JSON.stringify({ qr_value: val }),
    }).then((res) => {
      if (res.status === 'revoked') {
        setResult({ status: 'revoked', message: 'QR token revoked — contact admin' });
      } else {
        setResult({ status: 'invalid', message: 'QR code not recognized' });
      }
      addHistory(null, 'invalid', 'QR not recognized');
      if (clearRef.current) clearTimeout(clearRef.current);
      clearRef.current = setTimeout(() => { setResult(null); pausedRef.current = false; }, CLEAR_MS);
    }).catch(() => {
      setResult({ status: 'invalid', message: 'QR code not recognized' });
      addHistory(null, 'invalid', 'QR not recognized');
      if (clearRef.current) clearTimeout(clearRef.current);
      clearRef.current = setTimeout(() => { setResult(null); pausedRef.current = false; }, CLEAR_MS);
    });
  }, [qrMap, data, checkIn, addHistory]);

  // ─── Camera scanning with jsQR ─────────────────────────────

  const scanFrame = useCallback(() => {
    if (pausedRef.current) { animRef.current = requestAnimationFrame(scanFrame); return; }
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) { animRef.current = requestAnimationFrame(scanFrame); return; }

    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (typeof jsQR === 'function') {
      const code = jsQR(img.data, canvas.width, canvas.height);
      if (code?.data) { onQrDetected(code.data); return; }
    }
    animRef.current = requestAnimationFrame(scanFrame);
  }, [onQrDetected]);

  const startCam = useCallback(async () => {
    setCamErr(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } });
      streamRef.current = s;
      if (videoRef.current) { videoRef.current.srcObject = s; await videoRef.current.play(); }
      pausedRef.current = false;
      animRef.current = requestAnimationFrame(scanFrame);
    } catch { setCamErr('Camera access denied or not available.'); }
  }, [scanFrame]);

  const stopCam = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (mode === 'scanning') startCam();
    return () => stopCam();
  }, [mode, startCam, stopCam]);

  // Resume scanning after result clears
  useEffect(() => {
    if (!result && mode === 'scanning' && !pausedRef.current) {
      animRef.current = requestAnimationFrame(scanFrame);
    }
  }, [result, mode, scanFrame]);

  // ─── Manual search ─────────────────────────────────────────

  const doSearch = useCallback(() => {
    const f = firstName.trim().toLowerCase();
    const l = lastName.trim().toLowerCase();
    if (!f && !l) return;
    const m = data.filter((r) => {
      const fn = (r.first_name ?? '').toLowerCase();
      const ln = (r.last_name ?? '').toLowerCase();
      return (f ? fn.includes(f) : true) && (l ? ln.includes(l) : true);
    });
    if (m.length === 0) {
      setResult({ status: 'invalid', message: 'No traveler found' });
      if (clearRef.current) clearTimeout(clearRef.current);
      clearRef.current = setTimeout(() => setResult(null), CLEAR_MS);
    } else if (m.length === 1) {
      checkIn(m[0]); setFirstName(''); setLastName(''); setResults([]);
    } else {
      const exact = m.filter((r) => (r.first_name ?? '').toLowerCase() === f && (r.last_name ?? '').toLowerCase() === l);
      if (exact.length > 1) { setDisambig(exact); } else { setResults(m.slice(0, 10)); }
    }
  }, [firstName, lastName, data, checkIn]);

  const doDisambig = useCallback(() => {
    const y = parseInt(birthYear, 10);
    if (!y || !disambig) return;
    const now = new Date().getFullYear();
    const match = disambig.find((r) => r.age != null && (now - r.age) === y);
    if (match) { checkIn(match); setDisambig(null); setBirthYear(''); setFirstName(''); setLastName(''); }
    else { setResult({ status: 'invalid', message: 'No match for that year' }); if (clearRef.current) clearTimeout(clearRef.current); clearRef.current = setTimeout(() => setResult(null), CLEAR_MS); }
  }, [birthYear, disambig, checkIn]);

  // ─── SETUP SCREEN ──────────────────────────────────────────

  if (mode === 'setup') {
    return (
      <div style={{ padding: '1.5rem', maxWidth: 480, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>📷</div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>QR Scanner</h1>
          <p style={{ color: '#666', marginTop: '0.25rem' }}>Select session and fleet to begin</p>
          {qrMapLoading && <p style={{ color: '#999', fontSize: '0.8rem', marginTop: '0.5rem' }}>Loading QR database…</p>}
          {!qrMapLoading && qrMap.size > 0 && <p style={{ color: '#16a34a', fontSize: '0.8rem', marginTop: '0.5rem' }}>✓ {qrMap.size} QR codes loaded</p>}
        </div>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem' }}>Session *</label>
          <select value={session} onChange={(e) => setSession(e.target.value)} style={selectLg}>
            <option value="">— Select —</option>
            <option value="hotel-checkin">🏨 Hotel Check-in</option>
            {events.map((n) => <option key={n} value={n}>📅 {n}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem' }}>Fleet</label>
          <select value={fleet} onChange={(e) => setFleet(e.target.value)} style={selectLg}>
            <option value="">— All fleets —</option>
            {fleets.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <button disabled={!session} onClick={() => setMode('scanning')} style={{ width: '100%', padding: '1.1rem', fontSize: '1.3rem', fontWeight: 800, borderRadius: 14, border: 'none', color: '#fff', background: session ? '#16a34a' : '#ccc', cursor: session ? 'pointer' : 'not-allowed' }}>
          📷 Start Scanning
        </button>
      </div>
    );
  }

  // ─── SCANNING / MANUAL SCREEN ──────────────────────────────

  const cfg = result ? STATUS[result.status] : null;
  const isWrongFleetPrompt = result?.status === 'wrong_fleet' && wrongFleetTraveler;

  return (
    <div style={{ padding: '0.75rem', maxWidth: 700, margin: '0 auto' }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
          {session === 'hotel-checkin' ? '🏨 Hotel Check-in' : `📅 ${session}`}
          {fleet && <span style={{ color: '#666' }}> · {fleet}</span>}
        </span>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button onClick={() => setMode(mode === 'scanning' ? 'manual-search' : 'scanning')} style={smallBtn}>
            {mode === 'scanning' ? '🔍 Search' : '📷 Camera'}
          </button>
          <button onClick={() => { stopCam(); setMode('setup'); setResult(null); setWrongFleetTraveler(null); }} style={smallBtn}>⚙️</button>
        </div>
      </div>

      {/* Result card */}
      {result && cfg && (
        <div role="alert" style={{ padding: '1.25rem', borderRadius: 14, textAlign: 'center', marginBottom: '0.75rem', background: cfg.bg, border: `3px solid ${cfg.border}` }}>
          <div style={{ fontSize: '2.5rem' }}>{cfg.icon}</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: cfg.color }}>{cfg.label}</div>
          <div style={{ fontSize: '0.95rem', color: '#374151', marginTop: '0.2rem' }}>{result.message}</div>
          {result.traveler && (
            <div style={{ marginTop: '0.4rem', fontSize: '0.9rem', color: '#4b5563' }}>
              <strong>{result.traveler.first_name} {result.traveler.last_name}</strong>
              {result.traveler.room_assignment?.hotel_name && ` · ${result.traveler.room_assignment.hotel_name}`}
              {result.correctFleet && <> · Correct: <strong>{result.correctFleet}</strong></>}
            </div>
          )}

          {/* Wrong fleet prompt — Force or Deny */}
          {isWrongFleetPrompt ? (
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1rem' }}>
              <button onClick={handleDenyCheckIn} style={{ padding: '0.75rem 1.5rem', borderRadius: 10, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>
                ❌ Deny
              </button>
              <button onClick={handleForceCheckIn} style={{ padding: '0.75rem 1.5rem', borderRadius: 10, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>
                ✅ Force Check-in
              </button>
            </div>
          ) : (
            <div onClick={() => { setResult(null); pausedRef.current = false; }} style={{ marginTop: '0.4rem', fontSize: '0.65rem', color: '#9ca3af', cursor: 'pointer' }}>Tap to dismiss</div>
          )}
        </div>
      )}

      {/* Camera */}
      {mode === 'scanning' && (
        camErr ? (
          <div style={{ padding: '2rem', textAlign: 'center', background: '#fef2f2', borderRadius: 12, border: '1px solid #fecaca', marginBottom: '0.75rem' }}>
            <p style={{ color: '#dc2626', fontWeight: 600, marginBottom: '0.75rem' }}>📷 {camErr}</p>
            <button onClick={() => setMode('manual-search')} style={{ padding: '0.6rem 1.25rem', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '1rem' }}>
              🔍 Use Manual Search
            </button>
          </div>
        ) : (
          <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000', marginBottom: '0.75rem' }}>
            <video ref={videoRef} playsInline muted style={{ width: '100%', display: 'block', maxHeight: 320 }} />
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 180, height: 180, border: '3px solid rgba(255,255,255,0.5)', borderRadius: 16, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: 6, left: 0, right: 0, textAlign: 'center', color: '#fff', fontSize: '0.75rem', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
              Point at QR code
            </div>
          </div>
        )
      )}

      {/* Manual search */}
      {mode === 'manual-search' && (
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
            <input placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doSearch()} autoFocus style={inputStyle} />
            <input placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doSearch()} style={inputStyle} />
            <button onClick={doSearch} style={{ padding: '0.5rem 0.75rem', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Go</button>
          </div>
          {results.length > 0 && (
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
              {results.map((r) => (
                <button key={r.traveler_id} onClick={() => { checkIn(r); setResults([]); setFirstName(''); setLastName(''); }} style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '0.65rem 0.75rem', border: 'none', borderBottom: '1px solid #f3f4f6', background: '#fff', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                  <span style={{ fontWeight: 600 }}>{r.first_name} {r.last_name}</span>
                  <span style={{ fontSize: '0.8rem', color: '#888' }}>{r.groups?.[0] ?? ''}</span>
                </button>
              ))}
            </div>
          )}
          {disambig && (
            <div style={{ padding: '0.75rem', background: '#fffbeb', border: '1px solid #fbbf24', borderRadius: 8, marginTop: '0.5rem' }}>
              <p style={{ fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.9rem' }}>Multiple matches — enter birth year:</p>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <input placeholder="e.g. 1985" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doDisambig()} autoFocus type="number" style={{ ...inputStyle, maxWidth: 120 }} />
                <button onClick={doDisambig} style={{ padding: '0.4rem 0.75rem', borderRadius: 6, border: 'none', background: '#f59e0b', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>OK</button>
                <button onClick={() => { setDisambig(null); setBirthYear(''); }} style={smallBtn}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#555', marginBottom: '0.3rem' }}>Recent ({history.length})</div>
          <div style={{ maxHeight: 220, overflowY: 'auto', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '0.8rem' }}>
            {history.map((h) => {
              const c = STATUS[h.status];
              return (
                <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.6rem', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ color: '#aaa', minWidth: 50 }}>{h.time}</span>
                  <span style={{ flex: 1, fontWeight: 500 }}>{h.name ?? '—'}</span>
                  <span style={{ padding: '1px 5px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600, background: c.bg, color: c.color }}>{c.icon} {c.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const smallBtn: React.CSSProperties = { padding: '0.35rem 0.6rem', fontSize: '0.8rem', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' };
const inputStyle: React.CSSProperties = { flex: 1, padding: '0.5rem', fontSize: '1rem', borderRadius: 8, border: '1px solid #ccc' };
const selectLg: React.CSSProperties = { width: '100%', padding: '0.85rem', fontSize: '1.05rem', borderRadius: 10, border: '2px solid #e0e0e0' };

export default OpsScanner;
