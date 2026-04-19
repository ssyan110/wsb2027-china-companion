import { useOpsPanelStore, countActiveFilters } from '../../stores/ops-panel.store';
import type { OpsFilters } from '../../stores/ops-panel.store';

export interface FilterBarProps {
  filters: OpsFilters;
  onFilterChange: (key: string, value: string) => void;
  onClearAll: () => void;
  activeFilterCount: number;
}

const INVITEE_TYPE_OPTIONS = [
  { value: '', label: 'All Invitee Types' },
  { value: 'invitee', label: 'Invitee' },
  { value: 'guest', label: 'Guest' },
];

const PAX_TYPE_OPTIONS = [
  { value: '', label: 'All Pax Types' },
  { value: 'adult', label: 'Adult' },
  { value: 'child', label: 'Child' },
  { value: 'infant', label: 'Infant' },
];

const CHECKIN_STATUS_OPTIONS = [
  { value: '', label: 'All Check-in' },
  { value: 'pending', label: 'Pending' },
  { value: 'checked_in', label: 'Checked In' },
  { value: 'no_show', label: 'No Show' },
];

/**
 * FilterBar — dropdown filters for the ops master table.
 *
 * Provides dropdowns for: group, sub-group, hotel, invitee_type,
 * pax_type, checkin_status, vip_tag. Shows active filter count badge
 * and a "Clear All Filters" button.
 */
export function FilterBar({ filters, onFilterChange, onClearAll, activeFilterCount }: FilterBarProps) {
  return (
    <div className="filter-bar" data-testid="filter-bar" style={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.5rem 0',
    }}>
      {/* Group filter (free-text ID input) */}
      <label className="filter-bar__item" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <span style={{ fontSize: '0.8rem', color: '#666' }}>Group</span>
        <input
          type="text"
          placeholder="Group ID"
          value={filters.group_id ?? ''}
          aria-label="Filter by group"
          onChange={(e) => onFilterChange('group_id', e.target.value)}
          style={{ width: 100, padding: '0.25rem 0.4rem', fontSize: '0.85rem', border: '1px solid #ccc', borderRadius: 4 }}
        />
      </label>

      {/* Sub-group filter */}
      <label className="filter-bar__item" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <span style={{ fontSize: '0.8rem', color: '#666' }}>Sub-group</span>
        <input
          type="text"
          placeholder="Sub-group ID"
          value={filters.sub_group_id ?? ''}
          aria-label="Filter by sub-group"
          onChange={(e) => onFilterChange('sub_group_id', e.target.value)}
          style={{ width: 110, padding: '0.25rem 0.4rem', fontSize: '0.85rem', border: '1px solid #ccc', borderRadius: 4 }}
        />
      </label>

      {/* Hotel filter */}
      <label className="filter-bar__item" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <span style={{ fontSize: '0.8rem', color: '#666' }}>Hotel</span>
        <input
          type="text"
          placeholder="Hotel ID"
          value={filters.hotel_id ?? ''}
          aria-label="Filter by hotel"
          onChange={(e) => onFilterChange('hotel_id', e.target.value)}
          style={{ width: 100, padding: '0.25rem 0.4rem', fontSize: '0.85rem', border: '1px solid #ccc', borderRadius: 4 }}
        />
      </label>

      {/* Invitee type dropdown */}
      <label className="filter-bar__item" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <span style={{ fontSize: '0.8rem', color: '#666' }}>Invitee</span>
        <select
          value={filters.invitee_type ?? ''}
          aria-label="Filter by invitee type"
          onChange={(e) => onFilterChange('invitee_type', e.target.value)}
          style={{ padding: '0.25rem 0.4rem', fontSize: '0.85rem', border: '1px solid #ccc', borderRadius: 4 }}
        >
          {INVITEE_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </label>

      {/* Pax type dropdown */}
      <label className="filter-bar__item" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <span style={{ fontSize: '0.8rem', color: '#666' }}>Pax</span>
        <select
          value={filters.pax_type ?? ''}
          aria-label="Filter by pax type"
          onChange={(e) => onFilterChange('pax_type', e.target.value)}
          style={{ padding: '0.25rem 0.4rem', fontSize: '0.85rem', border: '1px solid #ccc', borderRadius: 4 }}
        >
          {PAX_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </label>

      {/* Check-in status dropdown */}
      <label className="filter-bar__item" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <span style={{ fontSize: '0.8rem', color: '#666' }}>Check-in</span>
        <select
          value={filters.checkin_status ?? ''}
          aria-label="Filter by check-in status"
          onChange={(e) => onFilterChange('checkin_status', e.target.value)}
          style={{ padding: '0.25rem 0.4rem', fontSize: '0.85rem', border: '1px solid #ccc', borderRadius: 4 }}
        >
          {CHECKIN_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </label>

      {/* VIP tag filter */}
      <label className="filter-bar__item" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <span style={{ fontSize: '0.8rem', color: '#666' }}>VIP</span>
        <input
          type="text"
          placeholder="VIP tag"
          value={filters.vip_tag ?? ''}
          aria-label="Filter by VIP tag"
          onChange={(e) => onFilterChange('vip_tag', e.target.value)}
          style={{ width: 90, padding: '0.25rem 0.4rem', fontSize: '0.85rem', border: '1px solid #ccc', borderRadius: 4 }}
        />
      </label>

      {/* Active filter count badge */}
      {activeFilterCount > 0 && (
        <span
          className="filter-bar__badge"
          data-testid="filter-count-badge"
          aria-label={`${activeFilterCount} active filters`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 22,
            height: 22,
            borderRadius: '50%',
            background: '#1976d2',
            color: '#fff',
            fontSize: '0.75rem',
            fontWeight: 700,
            padding: '0 4px',
          }}
        >
          {activeFilterCount}
        </span>
      )}

      {/* Clear All Filters button */}
      <button
        type="button"
        className="filter-bar__clear"
        data-testid="clear-filters-btn"
        disabled={activeFilterCount === 0}
        onClick={onClearAll}
        aria-label="Clear all filters"
        style={{
          padding: '0.25rem 0.75rem',
          fontSize: '0.85rem',
          border: '1px solid #ccc',
          borderRadius: 4,
          background: activeFilterCount > 0 ? '#fff' : '#f5f5f5',
          cursor: activeFilterCount > 0 ? 'pointer' : 'default',
          color: activeFilterCount > 0 ? '#d32f2f' : '#999',
        }}
      >
        Clear All Filters
      </button>
    </div>
  );
}

/**
 * Connected FilterBar that reads from and writes to the ops-panel store.
 * Use this in the OpsMasterTable page.
 */
export function ConnectedFilterBar() {
  const filters = useOpsPanelStore((s) => s.filters);
  const setFilter = useOpsPanelStore((s) => s.setFilter);
  const clearFilters = useOpsPanelStore((s) => s.clearFilters);
  const activeFilterCount = countActiveFilters(filters);

  return (
    <FilterBar
      filters={filters}
      onFilterChange={setFilter}
      onClearAll={clearFilters}
      activeFilterCount={activeFilterCount}
    />
  );
}
