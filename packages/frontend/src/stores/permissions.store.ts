import { create } from 'zustand';
import { apiClient } from '../lib/api';

interface PermissionsState {
  permissions: string[];
  loaded: boolean;
  fetchPermissions: () => Promise<void>;
  hasPermission: (perm: string) => boolean;
}

export const usePermissionsStore = create<PermissionsState>((set, get) => ({
  permissions: [],
  loaded: false,
  fetchPermissions: async () => {
    try {
      const res = await apiClient<{ permissions: string[] }>('/api/v1/admin/my-permissions');
      set({ permissions: res.permissions, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
  hasPermission: (perm) => get().permissions.includes(perm),
}));
