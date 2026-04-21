import { create } from 'zustand';
import type { RoleType } from '@wsb/shared';

interface AuthState {
  session_token: string | null;
  traveler_id: string | null;
  role: RoleType | null;
  isAuthenticated: boolean;
  login: (token: string, travelerId: string, role: RoleType) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session_token: null,
  traveler_id: null,
  role: null,
  isAuthenticated: false,
  login: (token, travelerId, role) =>
    set({ session_token: token, traveler_id: travelerId, role, isAuthenticated: true }),
  logout: () => {
    set({ session_token: null, traveler_id: null, role: null, isAuthenticated: false });
    // Clear all cached data
    try { localStorage.removeItem('wsb_qr_map'); } catch { /* ignore */ }
    // Clear IndexedDB caches
    try { indexedDB.deleteDatabase('wsb-companion'); } catch { /* ignore */ }
  },
}));
