import { useState, useEffect, useRef, useCallback } from 'react';
import { useOpsPanelStore } from '../../stores/ops-panel.store';
import type { ExtendedMasterListRow, EventAttendanceItem } from '@wsb/shared';

// ─── Types ───────────────────────────────────────────────────

type ScanStatus = 'pass' | 'already' | 'wrong_fleet' | 'invalid' | 'not_assigned';

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
  bookingId: string | null;
  status: ScanStatus;
  message: string;
  eventName: string;
}

// ─── Helpers ─────────────────────────────────────────────────

const STATUS_CONFIG: Record<ScanStatus, { bg: string; border: string; color: string; icon: string; label: string }> = {
  pass:         { bg: '#dcfce7', border: '#16a34a', color: '#15803d', icon: '✅', label: 'Checked In' },
  already:      { bg: '#dbeafe', border: '#2563eb', color: '#1d4ed8', icon: 'ℹ️', label: 'Already Scanned' },
  wrong_fleet:  { bg: '#fef9c3', border: '#ca8a04', color: '#a16207', icon: '⚠️', label: 'Wrong Fleet' },
  invalid:      { bg: '#fee2e2', border: '#dc2626', color: '#b91c1c', icon: '❌', label: 'Invalid QR' },
  not_assigned: { bg: '#fee2e2', border: '#dc2626', color: '#b91c1c', icon: '❌', label: 'Not Assigned' },
};

const MAX_HISTORY = 50;
const AUTO_CLEAR_MS = 5000;

// ─── Component ───────────────────────────────────────────────

export function OpsScanner() {
  const data = useOpsPanelStore((s) => s.data);
  const fetchData = useOpsPanelStore((s) => s.fetchData);

  // Scan mode
  const [selectedMode, setSelectedMode] = useState<string>('hotel-checkin');
  const [selectedFleet, setSelectedFleet] = useState<string>('');

  // Scan input
  const [scanInput, setScanInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Result
  const [result, setResult] = useState<ScanResult | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // History
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);

  // Local set of scanned traveler+event combos (to detect "already scanned")
  const scannedSetRef = useRef<Set<string>>(new Set());

  // Extract unique event names from loaded data
  const eventNames = Array.from(
    new Set(
      data.flatMap((r) =>
        (r.event_attendance ?? []).map((e: EventAttendanceItem) => e.event_name),
      ),
    ),
  ).sort();

  // Load data on mount if empty
  useEffect(() => {
    if (data.length === 0) fetchData();
  }, [data.length, fetchData]);

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Refocus input after result clears
  const refocusInput = useCallback(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // Process a scan
  const processScan = useCallback(
    (input: string) => {
      const trimmed = input.trim();
      if (!trimmed) return;

      // Find traveler by booking_id or name match
      const traveler = data.find(
        (r) =>
          r.booking_id === trimmed ||
          `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim().toLowerCase() === trimmed.toLowerCase() ||
          (r.full_name_raw ?? '').toLowerCase() === trimmed.toLowerCase(),
      );

      let scanResult: ScanResult;

      if (!traveler) {
        scanResult = { status: 'invalid', message: 'Traveler not found in system' };
      } else if (selectedMode === 'hotel-checkin') {
        // Hotel check-in mode
        const scanKey = `hotel:${traveler.traveler_id}`;
        if (scannedSetRef.current.has(scanKey)) {
          scanResult = { status: 'already', traveler, message: 'Already scanned for hotel check-in' };
        } else if (traveler.checkin_status === 'checked_in') {
          scanResult = { status: 'already', traveler, message: 'Already checked in at hotel' };
        } else {
          scannedSetRef.current.add(scanKey);
          scanResult = { status: 'pass', traveler, message: 'Hotel check-in successful' };
        }
      } else {
        // Event mode
        const eventAttendance = (traveler.event_attendance ?? []).find(
          (e: EventAttendanceItem) => e.event_name === selectedMode,
        );

        if (!eventAttendance) {
          scanResult = { status: 'not_assigned', traveler, message: 'Not assigned to this event' };
        } else {
          const scanKey = `${selectedMode}:${traveler.traveler_id}`;
          if (scannedSetRef.current.has(scanKey)) {
            scanResult = { status: 'already', traveler, message: `Already scanned for ${selectedMode}` };
          } else if (selectedFleet && eventAttendance.fleet_number && eventAttendance.fleet_number !== selectedFleet) {
            scannedSetRef.current.add(scanKey);
            scanResult = {
              status: 'wrong_fleet',
              traveler,
              message: `Wrong fleet — assigned to ${eventAttendance.fleet_number}`,
              correctFleet: eventAttendance.fleet_number,
            };
          } else {
            scannedSetRef.current.add(scanKey);
            scanResult = { status: 'pass', traveler, message: 'Valid — checked in' };
          }
        }
      }

      setResult(scanResult);
      setScanInput('');

      // Add to history
      setHistory((prev) => {
        const entry: ScanHistoryEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: new Date().toLocaleTimeString(),
          travelerName: scanResult.traveler
            ? `${scanResult.traveler.first_name ?? ''} ${scanResult.traveler.last_name ?? ''}`.trim() || scanResult.traveler.full_name_raw
            : null,
          bookingId: scanResult.traveler?.booking_id ?? null,
          status: scanResult.status,
          message: scanResult.message,
          eventName: selectedMode === 'hotel-checkin' ? 'Hotel Check-in' : selectedMode,
        };
        return [entry, ...prev].slice(0, MAX_HISTORY);
      });

      // Auto-clear after 5 seconds
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      clearTimerRef.current = setTimeout(() => {
        setResult(null);
        refocusInput();
      }, AUTO_CLEAR_MS);
    },
    [data, selectedMode, selectedFleet, refocusInput],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      processScan(scanInput);
    }
  };

  const dismissResult = () => {
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    setResult(null);
    refocusInput();
  };

  // ─── Render ────────────────────────────────────────────────

  const cfg = result ? STATUS_CONFIG[result.status] : null;

  return (
    <div style={{ padding: '1.5rem', maxWidth: 900, margin: '0 auto' }}>
      {/* Step 1: Mode selector */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.75rem' }}>
          📷 QR Scanner
        </h2>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <label htmlFor="scan-mode" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
            Scan Mode:
          </label>
          <select
            id="scan-mode"
            value={selectedMode}
            onChange={(e) => { setSelectedMode(e.target.value); setSelectedFleet(''); }}
            style={{
              padding: '0.5rem 0.75rem', fontSize: '0.95rem', borderRadius: 6,
              border: '1px solid #ccc', minWidth: 220,
            }}
          >
            <option value="hotel-checkin">🏨 Hotel Check-in</option>
            {eventNames.map((name) => (
              <option key={name} value={name}>📅 {name}</option>
            ))}
          </select>

          {selectedMode !== 'hotel-checkin' && (
            <>
              <label htmlFor="fleet-filter" style={{ fontWeight: 600, fontSize: '0.9rem', marginLeft: '0.5rem' }}>
                Fleet:
              </label>
              <input
                id="fleet-filter"
                type="text"
                placeholder="e.g. Fleet 8 (optional)"
                value={selectedFleet}
                onChange={(e) => setSelectedFleet(e.target.value)}
                style={{
                  padding: '0.5rem 0.75rem', fontSize: '0.95rem', borderRadius: 6,
                  border: '1px solid #ccc', width: 160,
                }}
              />
            </>
          )}
        </div>
        <div style={{
          marginTop: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: 6,
          background: '#f0f9ff', border: '1px solid #bae6fd', fontSize: '0.85rem', color: '#0369a1',
        }}>
          Active: <strong>{selectedMode === 'hotel-checkin' ? 'Hotel Check-in' : selectedMode}</strong>
          {selectedFleet && <> · Fleet: <strong>{selectedFleet}</strong></>}
          {' '}· {data.length} travelers loaded
        </div>
      </div>

      {/* Step 2: Scan input */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Scan or type booking ID (e.g. WSB-2027-001) or traveler name…"
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            style={{
              flex: 1, padding: '0.85rem 1rem', fontSize: '1.1rem', borderRadius: 8,
              border: '2px solid #6366f1', outline: 'none',
            }}
            aria-label="Scan input — enter booking ID or traveler name"
          />
          <button
            onClick={() => processScan(scanInput)}
            style={{
              padding: '0.85rem 1.5rem', fontSize: '1.1rem', fontWeight: 700,
              borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff',
              cursor: 'pointer',
            }}
            aria-label="Submit scan"
          >
            Scan
          </button>
        </div>
      </div>

      {/* Step 3: Result card */}
      {result && cfg && (
        <div
          role="alert"
          aria-live="assertive"
          onClick={dismissResult}
          style={{
            padding: '2rem', borderRadius: 16, textAlign: 'center',
            marginBottom: '1.5rem', cursor: 'pointer',
            background: cfg.bg, border: `3px solid ${cfg.border}`,
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>{cfg.icon}</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: cfg.color, marginBottom: '0.25rem' }}>
            {cfg.label}
          </div>
          <div style={{ fontSize: '1rem', color: '#374151', marginBottom: '0.5rem' }}>
            {result.message}
          </div>
          {result.traveler && (
            <div style={{
              display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.75rem',
              marginTop: '0.75rem', fontSize: '0.9rem', color: '#4b5563',
            }}>
              <span><strong>Name:</strong> {result.traveler.first_name ?? ''} {result.traveler.last_name ?? ''}</span>
              {result.traveler.booking_id && <span><strong>Booking:</strong> {result.traveler.booking_id}</span>}
              {result.traveler.room_assignment?.hotel_name && (
                <span><strong>Hotel:</strong> {result.traveler.room_assignment.hotel_name}</span>
              )}
              {result.traveler.pax_type && <span><strong>Pax:</strong> {result.traveler.pax_type}</span>}
              {result.correctFleet && <span><strong>Correct Fleet:</strong> {result.correctFleet}</span>}
            </div>
          )}
          <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#9ca3af' }}>
            Tap to dismiss · auto-clears in 5s
          </div>
        </div>
      )}

      {/* Step 4: Scan history */}
      {history.length > 0 && (
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>
            Recent Scans ({history.length})
          </h3>
          <div style={{ maxHeight: 350, overflowY: 'auto', borderRadius: 8, border: '1px solid #e5e7eb' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f9fafb', position: 'sticky', top: 0 }}>
                  <th style={thStyle}>Time</th>
                  <th style={thStyle}>Traveler</th>
                  <th style={thStyle}>Booking</th>
                  <th style={thStyle}>Result</th>
                  <th style={thStyle}>Event</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => {
                  const hCfg = STATUS_CONFIG[h.status];
                  return (
                    <tr key={h.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={tdStyle}>{h.timestamp}</td>
                      <td style={tdStyle}>{h.travelerName ?? '—'}</td>
                      <td style={tdStyle}>{h.bookingId ?? '—'}</td>
                      <td style={tdStyle}>
                        <span style={{
                          display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                          fontSize: '0.8rem', fontWeight: 600,
                          background: hCfg.bg, color: hCfg.color, border: `1px solid ${hCfg.border}`,
                        }}>
                          {hCfg.icon} {hCfg.label}
                        </span>
                      </td>
                      <td style={tdStyle}>{h.eventName}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Table styles ────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 600,
  borderBottom: '2px solid #e5e7eb', whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '0.4rem 0.75rem', whiteSpace: 'nowrap',
};
