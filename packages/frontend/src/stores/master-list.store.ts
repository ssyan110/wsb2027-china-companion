import { create } from 'zustand';
import type { MasterListRow, MasterListResponse } from '@wsb/shared';
import { apiClient } from '../lib/api';

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

interface MasterListFilters {
  role_type?: string;
  access_status?: string;
  group_id?: string;
  hotel_id?: string;
}

interface MasterListState {
  data: MasterListRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  search: string;
  filters: MasterListFilters;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  loading: boolean;
  error: string | null;
  visibleColumns: string[];
  fetchData: () => Promise<void>;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSearch: (q: string) => void;
  setFilter: (key: string, value: string) => void;
  setSort: (column: string) => void;
  setVisibleColumns: (columns: string[]) => void;
}

export const useMasterListStore = create<MasterListState>((set, get) => ({
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
  visibleColumns: DEFAULT_COLUMNS,

  fetchData: async () => {
    const { page, pageSize, search, filters, sortBy, sortOrder } = get();
    set({ loading: true, error: null });

    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('page_size', String(pageSize));
      params.set('sort_by', sortBy);
      params.set('sort_order', sortOrder);

      if (search) params.set('q', search);
      if (filters.role_type) params.set('role_type', filters.role_type);
      if (filters.access_status) params.set('access_status', filters.access_status);
      if (filters.group_id) params.set('group_id', filters.group_id);
      if (filters.hotel_id) params.set('hotel_id', filters.hotel_id);

      const res = await apiClient<MasterListResponse>(
        `/api/v1/admin/master-list?${params.toString()}`,
      );

      set({
        data: res.data,
        total: res.total,
        page: res.page,
        totalPages: res.total_pages,
        loading: false,
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch master list',
      });
    }
  },

  setPage: (page) => set({ page }),

  setPageSize: (size) => set({ pageSize: size, page: 1 }),

  setSearch: (q) => set({ search: q, page: 1 }),

  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value || undefined },
      page: 1,
    })),

  setSort: (column) =>
    set((state) => ({
      sortBy: column,
      sortOrder: state.sortBy === column && state.sortOrder === 'asc' ? 'desc' : 'asc',
      page: 1,
    })),

  setVisibleColumns: (columns) => set({ visibleColumns: columns }),
}));
