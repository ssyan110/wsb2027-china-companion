import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '../stores/auth.store';
import { useMasterListStore } from '../stores/master-list.store';

const DEFAULT_COLUMNS = [
  'full_name_raw',
  'email_primary',
  'booking_id',
  'role_type',
  'access_status',
  'groups',
  'hotels',
  'qr_active',
];

const COLUMN_LABELS: Record<string, string> = {
  traveler_id: 'Traveler ID',
  booking_id: 'Booking ID',
  family_id: 'Family ID',
  representative_id: 'Representative ID',
  guardian_id: 'Guardian ID',
  full_name_raw: 'Full Name',
  full_name_normalized: 'Normalized Name',
  email_primary: 'Email',
  email_aliases: 'Email Aliases',
  passport_name: 'Passport Name',
  phone: 'Phone',
  role_type: 'Role',
  access_status: 'Access Status',
  created_at: 'Created',
  updated_at: 'Updated',
  groups: 'Groups',
  hotels: 'Hotels',
  flights: 'Flights',
  bus_assignments: 'Bus Assignments',
  qr_active: 'QR Active',
};

function getStorageKey(travelerId: string): string {
  return `master-list-columns-${travelerId}`;
}

export function loadColumnVisibility(travelerId: string): string[] | null {
  try {
    const raw = localStorage.getItem(getStorageKey(travelerId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((v) => typeof v === 'string')) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveColumnVisibility(travelerId: string, columns: string[]): void {
  localStorage.setItem(getStorageKey(travelerId), JSON.stringify(columns));
}

export function getDefaultColumns(): string[] {
  return [...DEFAULT_COLUMNS];
}

interface ColumnVisibilityPanelProps {
  availableColumns: string[];
}

export function ColumnVisibilityPanel({ availableColumns }: ColumnVisibilityPanelProps) {
  const travelerId = useAuthStore((s) => s.traveler_id);
  const visibleColumns = useMasterListStore((s) => s.visibleColumns);
  const setVisibleColumns = useMasterListStore((s) => s.setVisibleColumns);
  const [open, setOpen] = useState(false);

  // On mount (or when travelerId changes), load saved preferences
  useEffect(() => {
    if (!travelerId) return;
    const saved = loadColumnVisibility(travelerId);
    if (saved) {
      // Only keep columns that are actually available
      const filtered = saved.filter((col) => availableColumns.includes(col));
      setVisibleColumns(filtered.length > 0 ? filtered : getDefaultColumns());
    } else {
      setVisibleColumns(getDefaultColumns().filter((col) => availableColumns.includes(col)));
    }
  }, [travelerId, availableColumns, setVisibleColumns]);

  const handleToggle = useCallback(
    (column: string) => {
      if (!travelerId) return;
      const isVisible = visibleColumns.includes(column);
      const updated = isVisible
        ? visibleColumns.filter((c) => c !== column)
        : [...visibleColumns, column];
      setVisibleColumns(updated);
      saveColumnVisibility(travelerId, updated);
    },
    [travelerId, visibleColumns, setVisibleColumns],
  );

  return (
    <div className="column-visibility-panel">
      <button
        type="button"
        className="column-visibility-toggle"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls="column-visibility-list"
      >
        Columns
      </button>
      {open && (
        <div
          id="column-visibility-list"
          className="column-visibility-list"
          role="group"
          aria-label="Column visibility toggles"
        >
          {availableColumns.map((col) => (
            <label key={col} className="column-visibility-item">
              <input
                type="checkbox"
                checked={visibleColumns.includes(col)}
                onChange={() => handleToggle(col)}
              />
              <span>{COLUMN_LABELS[col] ?? col}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
