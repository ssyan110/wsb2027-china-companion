import { useState, useRef, useEffect, useCallback } from 'react';

export type CheckinStatus = 'pending' | 'checked_in' | 'no_show';

export interface CheckinManagerProps {
  travelerId: string;
  currentStatus: CheckinStatus;
  onStatusChange: (newStatus: string) => Promise<void>;
}

/**
 * Maps a checkin_status value to its corresponding CSS badge class.
 * Exported for use in property tests.
 */
export function getStatusBadgeClass(status: CheckinStatus): string {
  switch (status) {
    case 'pending':
      return 'badge-warning';
    case 'checked_in':
      return 'badge-success';
    case 'no_show':
      return 'badge-danger';
    default:
      return 'badge-warning';
  }
}

/**
 * Maps a checkin_status value to a display label.
 */
function getStatusLabel(status: CheckinStatus): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'checked_in':
      return 'Checked In';
    case 'no_show':
      return 'No Show';
    default:
      return String(status);
  }
}

const STATUS_OPTIONS: { value: CheckinStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'checked_in', label: 'Checked In' },
  { value: 'no_show', label: 'No Show' },
];

/**
 * CheckinManager — color-coded badge with dropdown for check-in status.
 *
 * Displays the current checkin_status as a color-coded badge:
 * - yellow (pending)
 * - green (checked_in)
 * - red (no_show)
 *
 * Clicking the badge opens a dropdown to select a new status.
 * Status change calls onStatusChange which should invoke
 * ops-panel.store.patchTraveler with the checkin_status field.
 */
export function CheckinManager({ travelerId, currentStatus, onStatusChange }: CheckinManagerProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Clear error toast after 3 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleStatusSelect = useCallback(async (newStatus: CheckinStatus) => {
    if (newStatus === currentStatus || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onStatusChange(newStatus);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setSaving(false);
    }
  }, [currentStatus, saving, onStatusChange]);

  const badgeClass = getStatusBadgeClass(currentStatus);

  return (
    <div
      className="checkin-manager"
      data-testid="checkin-manager"
      ref={dropdownRef}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      {/* Color-coded badge */}
      <button
        type="button"
        className={`checkin-badge ${badgeClass}`}
        data-testid="checkin-badge"
        disabled={saving}
        onClick={() => setOpen(!open)}
        aria-label={`Check-in status: ${getStatusLabel(currentStatus)}`}
        aria-expanded={open}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          padding: '0.2rem 0.6rem',
          borderRadius: 12,
          border: 'none',
          fontSize: '0.8rem',
          fontWeight: 600,
          cursor: saving ? 'wait' : 'pointer',
          background: badgeClass === 'badge-warning' ? '#fff3cd'
            : badgeClass === 'badge-success' ? '#d4edda'
            : '#f8d7da',
          color: badgeClass === 'badge-warning' ? '#856404'
            : badgeClass === 'badge-success' ? '#155724'
            : '#721c24',
        }}
      >
        {saving ? '...' : getStatusLabel(currentStatus)}
      </button>

      {/* Dropdown */}
      {open && !saving && (
        <ul
          className="checkin-dropdown"
          data-testid="checkin-dropdown"
          role="listbox"
          aria-label="Select check-in status"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            zIndex: 10,
            margin: '2px 0 0',
            padding: '0.25rem 0',
            listStyle: 'none',
            background: '#fff',
            border: '1px solid #ccc',
            borderRadius: 4,
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            minWidth: 130,
          }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <li key={opt.value}>
              <button
                type="button"
                role="option"
                aria-selected={opt.value === currentStatus}
                data-testid={`checkin-option-${opt.value}`}
                onClick={() => handleStatusSelect(opt.value)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '0.35rem 0.75rem',
                  border: 'none',
                  background: opt.value === currentStatus ? '#e3f2fd' : 'transparent',
                  textAlign: 'left',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  fontWeight: opt.value === currentStatus ? 600 : 400,
                }}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Error toast */}
      {error && (
        <span className="checkin-manager__toast" role="alert" style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: 4,
          padding: '0.25rem 0.5rem',
          background: '#f8d7da',
          color: '#721c24',
          fontSize: '0.75rem',
          borderRadius: 4,
          whiteSpace: 'nowrap',
        }}>
          {error}
        </span>
      )}
    </div>
  );
}
