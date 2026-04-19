import { getDb } from './db';
import { useAppStore } from '../stores/app.store';

// ─── Types ───────────────────────────────────────────────────

type SyncEntity = 'profile' | 'itinerary' | 'notifications' | 'familyMembers' | 'scanQueue';

// ─── Helpers ─────────────────────────────────────────────────

async function getLastSynced(entity: SyncEntity): Promise<string | null> {
  const db = await getDb();
  const meta = await db.get('syncMeta', entity);
  return meta?.last_synced ?? null;
}

async function setLastSynced(entity: SyncEntity): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.put('syncMeta', { entity, last_synced: now });
  useAppStore.getState().setLastSynced(now);
}

/**
 * Authenticated fetch helper. Reads session_token from auth store.
 * Returns null on network/auth failure so callers can degrade gracefully.
 */
let _apiModule: typeof import('./api') | null = null;
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    // Dynamic import to avoid circular deps — cached after first load
    if (!_apiModule) {
      _apiModule = await import('./api');
    }
    return await _apiModule.apiClient<T>(path, init);
  } catch {
    return null;
  }
}

// ─── Entity Sync Functions ───────────────────────────────────

/** Sync traveler profile — server-wins: always overwrite local. */
export async function syncProfile(): Promise<void> {
  const data = await apiFetch<Record<string, unknown>>('/api/v1/travelers/me');
  if (!data) return;

  const db = await getDb();
  await db.put('profile', data as any, 'me');

  // Also cache QR token separately for offline QR display
  if ('qr_token' in data && 'full_name' in data) {
    await db.put('qrToken', {
      token_value: data.qr_token as string,
      traveler_name: data.full_name as string,
    }, 'me');
  }

  // Cache taxi card if hotel info present
  if (data.hotel && typeof data.hotel === 'object') {
    const hotel = data.hotel as Record<string, string>;
    await db.put('taxiCard', {
      hotel_name_en: hotel.name ?? '',
      hotel_name_cn: hotel.address_cn ?? '',
      address_en: hotel.address_en ?? '',
      address_cn: hotel.address_cn ?? '',
    }, 'me');
  }

  await setLastSynced('profile');
}

/** Sync itinerary — server-wins: clear local and replace. */
export async function syncItinerary(): Promise<void> {
  const data = await apiFetch<{ events: unknown[] }>('/api/v1/travelers/me/itinerary');
  if (!data?.events) return;

  const db = await getDb();
  const tx = db.transaction('itinerary', 'readwrite');
  await tx.store.clear();
  for (const event of data.events) {
    await tx.store.put(event as any);
  }
  await tx.done;
  await setLastSynced('itinerary');
}

/** Sync notifications — server-wins: clear local and replace. */
export async function syncNotifications(): Promise<void> {
  const data = await apiFetch<{ notifications: unknown[] }>('/api/v1/travelers/me/notifications');
  if (!data?.notifications) return;

  const db = await getDb();
  const tx = db.transaction('notifications', 'readwrite');
  await tx.store.clear();
  for (const n of data.notifications) {
    await tx.store.put(n as any);
  }
  await tx.done;
  await setLastSynced('notifications');
}

/** Sync family members — server-wins: clear local and replace. */
export async function syncFamilyMembers(): Promise<void> {
  const data = await apiFetch<{ family_id: string; members: unknown[] }>('/api/v1/travelers/me/family');
  if (!data?.members) return;

  const db = await getDb();
  const tx = db.transaction('familyMembers', 'readwrite');
  await tx.store.clear();
  for (const member of data.members) {
    await tx.store.put(member as any);
  }
  await tx.done;
  await setLastSynced('familyMembers');
}

/** Upload queued scan logs that haven't been synced yet. */
export async function uploadScanQueue(): Promise<void> {
  const db = await getDb();
  const unsynced = await db.getAllFromIndex('scanQueue', 'by-synced', 0);
  if (unsynced.length === 0) return;

  const scans = unsynced.map(({ id: _id, synced: _synced, ...rest }) => rest);
  const result = await apiFetch<{ ok: boolean }>('/api/v1/staff/scans/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scans }),
  });

  if (!result) return;

  // Mark uploaded entries as synced
  const tx = db.transaction('scanQueue', 'readwrite');
  for (const entry of unsynced) {
    await tx.store.put({ ...entry, synced: 1 });
  }
  await tx.done;
  await setLastSynced('scanQueue');
}

// ─── Orchestration ───────────────────────────────────────────

/** Run all sync operations. Errors in individual syncs don't block others. */
export async function syncAll(): Promise<void> {
  const results = await Promise.allSettled([
    syncProfile(),
    syncItinerary(),
    syncNotifications(),
    syncFamilyMembers(),
    uploadScanQueue(),
  ]);

  // Log failures for debugging but don't throw
  for (const r of results) {
    if (r.status === 'rejected') {
      console.warn('[sync] entity sync failed:', r.reason);
    }
  }
}

// ─── Connectivity Listener ───────────────────────────────────

let listenerRegistered = false;

/**
 * Registers online/offline event listeners.
 * On connectivity restore, triggers a full sync within 60 seconds (Req 24.3).
 * Updates the Zustand app store's isOnline flag (Req 24.4).
 */
export function registerConnectivityListeners(): void {
  if (listenerRegistered || typeof window === 'undefined') return;
  listenerRegistered = true;

  const store = useAppStore.getState;

  window.addEventListener('online', () => {
    store().setOnline(true);
    // Trigger background sync on connectivity restore
    syncAll().catch((err) => console.warn('[sync] background sync failed:', err));
  });

  window.addEventListener('offline', () => {
    store().setOnline(false);
  });
}
