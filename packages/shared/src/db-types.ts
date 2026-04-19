// WSB 2027 China Companion — IndexedDB Schema Types

import type { RoleType, EventType } from './enums';
import type { TravelerProfile, ItineraryEvent, NotificationItem, FamilyMember } from './api-types';

// ─── Store Value Types ───────────────────────────────────────

export interface QrTokenCache {
  token_value: string;
  traveler_name: string;
}

export interface TaxiCardCache {
  hotel_name_en: string;
  hotel_name_cn: string;
  address_en: string;
  address_cn: string;
}

export interface Phrase {
  id: string;
  category: string;
  english: string;
  chinese: string;
  pinyin: string;
}

export interface ExchangeRateCache {
  rate: number;
  fetched_at: string;
}

export interface ManifestEntry {
  qr_token_value: string;
  traveler_id: string;
  full_name: string;
  family_id: string | null;
  role_type: RoleType;
  eligibility: string[];
}

export interface ManifestMeta {
  version: string;
  synced_at: string;
  count: number;
}

export interface ScanLogEntry {
  id: string;
  qr_token_value: string;
  scan_mode: string;
  result: 'pass' | 'fail' | 'wrong_assignment' | 'override';
  override_reason?: string;
  device_id: string;
  scanned_at: string;
  synced: 0 | 1;
}

export interface SyncMeta {
  last_synced: string;
  entity: string;
}

// ─── CompanionDB Schema ─────────────────────────────────────

export interface CompanionDB {
  profile: {
    key: 'me';
    value: TravelerProfile;
  };
  qrToken: {
    key: 'me';
    value: QrTokenCache;
  };
  familyMembers: {
    key: string;
    value: FamilyMember;
    indexes: { 'by-family': string };
  };
  itinerary: {
    key: string;
    value: ItineraryEvent;
    indexes: { 'by-date': string };
  };
  notifications: {
    key: string;
    value: NotificationItem;
    indexes: { 'by-published': string };
  };
  taxiCard: {
    key: 'me';
    value: TaxiCardCache;
  };
  phrasebook: {
    key: string;
    value: Phrase;
    indexes: { 'by-category': string };
  };
  exchangeRate: {
    key: 'latest';
    value: ExchangeRateCache;
  };
  manifest: {
    key: string;
    value: ManifestEntry;
    indexes: { 'by-token': string };
  };
  manifestMeta: {
    key: 'meta';
    value: ManifestMeta;
  };
  scanQueue: {
    key: string;
    value: ScanLogEntry;
    indexes: { 'by-synced': number };
  };
  syncMeta: {
    key: string;
    value: SyncMeta;
  };
}

export const DB_NAME = 'wsb-companion';
export const DB_VERSION = 1;
