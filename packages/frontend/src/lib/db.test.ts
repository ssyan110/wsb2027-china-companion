import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock idb's openDB
const mockObjectStoreNames = { contains: vi.fn().mockReturnValue(false) };
const mockCreateIndex = vi.fn();
const mockCreateObjectStore = vi.fn().mockReturnValue({ createIndex: mockCreateIndex });
const mockDb = {
  objectStoreNames: mockObjectStoreNames,
  createObjectStore: mockCreateObjectStore,
};

vi.mock('idb', () => ({
  openDB: vi.fn((_name: string, _version: number, opts: any) => {
    // Invoke the upgrade callback to verify store creation
    if (opts?.upgrade) {
      opts.upgrade(mockDb);
    }
    return Promise.resolve(mockDb);
  }),
}));

vi.mock('@wsb/shared', () => ({
  DB_NAME: 'wsb-companion',
  DB_VERSION: 1,
}));

describe('db.ts - getDb()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockObjectStoreNames.contains.mockReturnValue(false);
    // Reset the singleton by re-importing
    vi.resetModules();
  });

  it('should create all 12 object stores on upgrade', async () => {
    const { getDb } = await import('./db');
    await getDb();

    const storeNames = mockCreateObjectStore.mock.calls.map((c: any[]) => c[0]);
    expect(storeNames).toContain('profile');
    expect(storeNames).toContain('qrToken');
    expect(storeNames).toContain('familyMembers');
    expect(storeNames).toContain('itinerary');
    expect(storeNames).toContain('notifications');
    expect(storeNames).toContain('taxiCard');
    expect(storeNames).toContain('phrasebook');
    expect(storeNames).toContain('exchangeRate');
    expect(storeNames).toContain('manifest');
    expect(storeNames).toContain('manifestMeta');
    expect(storeNames).toContain('scanQueue');
    expect(storeNames).toContain('syncMeta');
    expect(storeNames).toHaveLength(12);
  });

  it('should create indexes on familyMembers, itinerary, notifications, phrasebook, manifest, scanQueue', async () => {
    const { getDb } = await import('./db');
    await getDb();

    const indexCalls = mockCreateIndex.mock.calls.map((c: any[]) => c[0]);
    expect(indexCalls).toContain('by-family');
    expect(indexCalls).toContain('by-date');
    expect(indexCalls).toContain('by-published');
    expect(indexCalls).toContain('by-category');
    expect(indexCalls).toContain('by-token');
    expect(indexCalls).toContain('by-synced');
  });

  it('should return a singleton database instance', async () => {
    const { getDb } = await import('./db');
    const db1 = await getDb();
    const db2 = await getDb();
    expect(db1).toBe(db2);
  });

  it('should skip creating stores that already exist', async () => {
    mockObjectStoreNames.contains.mockReturnValue(true);
    const { getDb } = await import('./db');
    await getDb();

    expect(mockCreateObjectStore).not.toHaveBeenCalled();
  });
});
