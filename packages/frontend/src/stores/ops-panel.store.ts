import { create } from 'zustand';
import type { ExtendedMasterListRow, MasterListResponse } from '@wsb/shared';
import { apiClient } from '../lib/api';

export interface OpsFilters {
  group_id?: string;
  sub_group_id?: string;
  hotel_id?: string;
  invitee_type?: string;
  pax_type?: string;
  checkin_status?: string;
  vip_tag?: string;
  role_type?: string;
  access_status?: string;
}

export interface OpsEditingCell {
  travelerId: string;
  field: string;
}

export interface OpsPanelState {
  // Data
  data: ExtendedMasterListRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;

  // Search & filters
  search: string;
  filters: OpsFilters;
  sortBy: string;
  sortOrder: 'asc' | 'desc';

  // UI state
  loading: boolean;
  error: string | null;
  editingCell: OpsEditingCell | null;
  expandedRows: Set<string>;
  unmaskPii: boolean;

  // Actions
  fetchData: () => Promise<void>;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSearch: (q: string) => void;
  setFilter: (key: string, value: string) => void;
  clearFilters: () => void;
  setSort: (column: string) => void;
  setEditingCell: (cell: OpsEditingCell | null) => void;
  toggleExpandedRow: (travelerId: string) => void;
  setUnmaskPii: (unmask: boolean) => void;
  patchTraveler: (id: string, field: string, value: unknown) => Promise<void>;
}

/** Counts the number of non-empty filter values in an OpsFilters object. */
export function countActiveFilters(filters: OpsFilters): number {
  return Object.values(filters).filter((v) => v !== undefined && v !== '').length;
}

export const useOpsPanelStore = create<OpsPanelState>((set, get) => ({
  data: [],
  total: 0,
  page: 1,
  pageSize: 50,
  totalPages: 0,
  search: '',
  filters: {},
  sortBy: 'created_at',
  sortOrder: 'desc',
  loading: false,
  error: null,
  editingCell: null,
  expandedRows: new Set<string>(),
  unmaskPii: false,

  fetchData: async () => {
    const { page, pageSize, search, filters, sortBy, sortOrder, unmaskPii } = get();
    set({ loading: true, error: null });

    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('page_size', String(pageSize));
      params.set('sort_by', sortBy);
      params.set('sort_order', sortOrder);

      if (search) params.set('q', search);
      if (unmaskPii) params.set('unmask', 'true');

      // Apply all non-empty filters
      if (filters.role_type) params.set('role_type', filters.role_type);
      if (filters.access_status) params.set('access_status', filters.access_status);
      if (filters.group_id) params.set('group_id', filters.group_id);
      if (filters.sub_group_id) params.set('sub_group_id', filters.sub_group_id);
      if (filters.hotel_id) params.set('hotel_id', filters.hotel_id);
      if (filters.invitee_type) params.set('invitee_type', filters.invitee_type);
      if (filters.pax_type) params.set('pax_type', filters.pax_type);
      if (filters.checkin_status) params.set('checkin_status', filters.checkin_status);
      if (filters.vip_tag) params.set('vip_tag', filters.vip_tag);

      const res = await apiClient<MasterListResponse>(
        `/api/v1/admin/master-list?${params.toString()}`,
      );

      set({
        data: res.data as ExtendedMasterListRow[],
        total: res.total,
        page: res.page,
        totalPages: res.total_pages,
        loading: false,
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch data',
      });
    }
  },

  patchTraveler: async (id, field, value) => {
    try {
      await apiClient(`/api/v1/admin/travelers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ [field]: value }),
      });
      // Refresh data on success
      await get().fetchData();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update traveler');
    }
  },

  setSearch: (q) => set({ search: q, page: 1 }),

  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value || undefined },
      page: 1,
    })),

  clearFilters: () => set({ filters: {}, page: 1 }),

  setSort: (column) =>
    set((state) => ({
      sortBy: column,
      sortOrder: state.sortBy === column && state.sortOrder === 'asc' ? 'desc' : 'asc',
      page: 1,
    })),

  setPage: (page) => set({ page }),

  setPageSize: (size) => set({ pageSize: size, page: 1 }),

  setEditingCell: (cell) => set({ editingCell: cell }),

  toggleExpandedRow: (travelerId) =>
    set((state) => {
      const next = new Set(state.expandedRows);
      if (next.has(travelerId)) {
        next.delete(travelerId);
      } else {
        next.add(travelerId);
      }
      return { expandedRows: next };
    }),

  setUnmaskPii: (unmask) => set({ unmaskPii: unmask }),
}));
