import { openDB, type IDBPDatabase } from 'idb';
import { DB_NAME, DB_VERSION, type CompanionDB } from '@wsb/shared';

let dbPromise: Promise<IDBPDatabase<CompanionDB>> | null = null;

/**
 * Returns a singleton IndexedDB database instance.
 * Creates the database and all object stores on first call.
 */
export function getDb(): Promise<IDBPDatabase<CompanionDB>> {
  if (!dbPromise) {
    dbPromise = openDB<CompanionDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Traveler data cache
        if (!db.objectStoreNames.contains('profile')) {
          db.createObjectStore('profile');
        }

        if (!db.objectStoreNames.contains('qrToken')) {
          db.createObjectStore('qrToken');
        }

        if (!db.objectStoreNames.contains('familyMembers')) {
          const store = db.createObjectStore('familyMembers', { keyPath: 'traveler_id' });
          store.createIndex('by-family', 'traveler_id');
        }

        if (!db.objectStoreNames.contains('itinerary')) {
          const store = db.createObjectStore('itinerary', { keyPath: 'event_id' });
          store.createIndex('by-date', 'date');
        }

        if (!db.objectStoreNames.contains('notifications')) {
          const store = db.createObjectStore('notifications', { keyPath: 'notification_id' });
          store.createIndex('by-published', 'published_at');
        }

        // Toolkit cache
        if (!db.objectStoreNames.contains('taxiCard')) {
          db.createObjectStore('taxiCard');
        }

        if (!db.objectStoreNames.contains('phrasebook')) {
          const store = db.createObjectStore('phrasebook', { keyPath: 'id' });
          store.createIndex('by-category', 'category');
        }

        if (!db.objectStoreNames.contains('exchangeRate')) {
          db.createObjectStore('exchangeRate');
        }

        // Staff data
        if (!db.objectStoreNames.contains('manifest')) {
          const store = db.createObjectStore('manifest', { keyPath: 'qr_token_value' });
          store.createIndex('by-token', 'qr_token_value');
        }

        if (!db.objectStoreNames.contains('manifestMeta')) {
          db.createObjectStore('manifestMeta');
        }

        if (!db.objectStoreNames.contains('scanQueue')) {
          const store = db.createObjectStore('scanQueue', { keyPath: 'id' });
          store.createIndex('by-synced', 'synced');
        }

        // Sync metadata
        if (!db.objectStoreNames.contains('syncMeta')) {
          db.createObjectStore('syncMeta', { keyPath: 'entity' });
        }
      },
    });
  }
  return dbPromise;
}
