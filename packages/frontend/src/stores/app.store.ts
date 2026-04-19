import { create } from 'zustand';

interface AppState {
  isOnline: boolean;
  lastSynced: string | null;
  setOnline: (online: boolean) => void;
  setLastSynced: (timestamp: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  lastSynced: null,
  setOnline: (online) => set({ isOnline: online }),
  setLastSynced: (timestamp) => set({ lastSynced: timestamp }),
}));
