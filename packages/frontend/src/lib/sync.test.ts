import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────

const mockPut = vi.fn();
const mockGet = vi.fn().mockResolvedValue(null);
const mockClear = vi.fn();
const mockStorePut = vi.fn();
const mockGetAllFromIndex = vi.fn().mockResolvedValue([]);
const mockTxDone = Promise.resolve();

const mockDb = {
  put: mockPut,
  get: mockGet,
  getAllFromIndex: mockGetAllFromIndex,
  transaction: vi.fn().mockReturnValue({
    store: { clear: mockClear, put: mockStorePut },
    done: mockTxDone,
  }),
};

vi.mock('./db', () => ({
  getDb: vi.fn().mockResolvedValue(mockDb),
}));

const mockApiClient = vi.fn();
vi.mock('./api', () => ({
  apiClient: (...args: any[]) => mockApiClient(...args),
}));

const mockSetOnline = vi.fn();
const mockSetLastSynced = vi.fn();
vi.mock('../stores/app.store', () => ({
  useAppStore: {
    getState: () => ({
      setOnline: mockSetOnline,
      setLastSynced: mockSetLastSynced,
    }),
  },
}));

describe('sync.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiClient.mockResolvedValue(null);
  });

  describe('syncProfile()', () => {
    it('should fetch profile and store in IndexedDB', async () => {
      const profile = {
        traveler_id: 't1',
        full_name: 'John Doe',
        qr_token: 'qr123',
        hotel: { name: 'Grand Hotel', address_en: '123 Main St', address_cn: '主街123号' },
      };
      mockApiClient.mockResolvedValueOnce(profile);

      const { syncProfile } = await import('./sync');
      await syncProfile();

      expect(mockApiClient).toHaveBeenCalledWith('/api/v1/travelers/me', undefined);
      expect(mockPut).toHaveBeenCalledWith('profile', profile, 'me');
      expect(mockPut).toHaveBeenCalledWith('qrToken', {
        token_value: 'qr123',
        traveler_name: 'John Doe',
      }, 'me');
      // Taxi card cached
      expect(mockPut).toHaveBeenCalledWith('taxiCard', expect.objectContaining({
        address_en: '123 Main St',
        address_cn: '主街123号',
      }), 'me');
      // syncMeta updated
      expect(mockPut).toHaveBeenCalledWith('syncMeta', expect.objectContaining({ entity: 'profile' }));
    });

    it('should not write to DB when API returns null', async () => {
      mockApiClient.mockResolvedValueOnce(null);

      const { syncProfile } = await import('./sync');
      await syncProfile();

      // Only the apiClient call, no DB writes
      expect(mockPut).not.toHaveBeenCalled();
    });
  });

  describe('syncItinerary()', () => {
    it('should clear and replace itinerary events', async () => {
      const events = [
        { event_id: 'e1', name: 'Gala', date: '2027-06-01' },
        { event_id: 'e2', name: 'Tour', date: '2027-06-02' },
      ];
      mockApiClient.mockResolvedValueOnce({ events });

      const { syncItinerary } = await import('./sync');
      await syncItinerary();

      expect(mockClear).toHaveBeenCalled();
      expect(mockStorePut).toHaveBeenCalledTimes(2);
    });
  });

  describe('syncNotifications()', () => {
    it('should clear and replace notifications', async () => {
      const notifications = [
        { notification_id: 'n1', title: 'Bus change', body: 'Bus 5 now', published_at: '2027-06-01T10:00:00Z' },
      ];
      mockApiClient.mockResolvedValueOnce({ notifications });

      const { syncNotifications } = await import('./sync');
      await syncNotifications();

      expect(mockClear).toHaveBeenCalled();
      expect(mockStorePut).toHaveBeenCalledTimes(1);
    });
  });

  describe('uploadScanQueue()', () => {
    it('should upload unsynced scans and mark them as synced', async () => {
      const unsynced = [
        { id: 's1', qr_token_value: 'qr1', scan_mode: 'bus', result: 'pass', device_id: 'd1', scanned_at: '2027-06-01T10:00:00Z', synced: 0 },
      ];
      mockGetAllFromIndex.mockResolvedValueOnce(unsynced);
      mockApiClient.mockResolvedValueOnce({ ok: true });

      const { uploadScanQueue } = await import('./sync');
      await uploadScanQueue();

      expect(mockApiClient).toHaveBeenCalledWith('/api/v1/staff/scans/batch', expect.objectContaining({
        method: 'POST',
      }));
      // Should mark as synced
      expect(mockStorePut).toHaveBeenCalledWith(expect.objectContaining({ id: 's1', synced: 1 }));
    });

    it('should skip upload when queue is empty', async () => {
      mockGetAllFromIndex.mockResolvedValueOnce([]);

      const { uploadScanQueue } = await import('./sync');
      await uploadScanQueue();

      expect(mockApiClient).not.toHaveBeenCalled();
    });
  });

  describe('syncAll()', () => {
    it('should run all sync operations without throwing', async () => {
      mockApiClient.mockResolvedValue(null);
      mockGetAllFromIndex.mockResolvedValue([]);

      const { syncAll } = await import('./sync');
      await syncAll();
    });
  });

  describe('registerConnectivityListeners()', () => {
    it('should register online and offline event listeners when window is available', async () => {
      // Reset module to clear the listenerRegistered flag
      vi.resetModules();

      // Create a minimal window mock
      const listeners: Record<string, Function> = {};
      const mockWindow = {
        addEventListener: vi.fn((event: string, handler: Function) => {
          listeners[event] = handler;
        }),
      };
      vi.stubGlobal('window', mockWindow);

      // Re-mock dependencies after resetModules
      vi.doMock('./db', () => ({ getDb: vi.fn().mockResolvedValue(mockDb) }));
      vi.doMock('./api', () => ({ apiClient: mockApiClient }));
      vi.doMock('../stores/app.store', () => ({
        useAppStore: {
          getState: () => ({
            setOnline: mockSetOnline,
            setLastSynced: mockSetLastSynced,
          }),
        },
      }));

      const { registerConnectivityListeners } = await import('./sync');
      registerConnectivityListeners();

      const eventNames = mockWindow.addEventListener.mock.calls.map((c: any[]) => c[0]);
      expect(eventNames).toContain('online');
      expect(eventNames).toContain('offline');

      vi.unstubAllGlobals();
    });
  });
});
