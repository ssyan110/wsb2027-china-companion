// WSB 2027 China Companion — Mock API Layer
// Returns realistic mock data for all API endpoints when no backend is available.

import type {
  TravelerProfile,
  FamilyMember,
  FamilyResponse,
  ItineraryEvent,
  ItineraryResponse,
  NotificationItem,
  NotificationsResponse,
  MagicLinkResponse,
  VerifyResponse,
  BookingLookupResponse,
} from '@wsb/shared';

// ─── Mock Data ──────────────────────────────────────────────

const MOCK_PROFILE: TravelerProfile = {
  traveler_id: 'trav-001-sarah',
  full_name: 'Sarah Chen',
  email: 'sarah.chen@example.com',
  role_type: 'representative',
  access_status: 'activated',
  family_id: 'fam-chen-001',
  group_ids: ['grp-vip-delegates', 'grp-day2-great-wall'],
  hotel: {
    hotel_id: 'htl-peninsula-bj',
    name: 'The Peninsula Beijing',
    address_en: '8 Goldfish Lane, Wangfujing, Dongcheng District, Beijing 100006',
    address_cn: '北京市东城区王府井金鱼胡同8号 半岛酒店',
  },
  qr_token: 'QR-SARAH-CHEN-WSB2027-A1B2C3',
};

const MOCK_FAMILY_MEMBERS: FamilyMember[] = [
  {
    traveler_id: 'trav-001-sarah',
    full_name: 'Sarah Chen',
    role_type: 'representative',
    qr_token_value: 'QR-SARAH-CHEN-WSB2027-A1B2C3',
  },
  {
    traveler_id: 'trav-002-michael',
    full_name: 'Michael Chen',
    role_type: 'traveler',
    qr_token_value: 'QR-MICHAEL-CHEN-WSB2027-D4E5F6',
  },
  {
    traveler_id: 'trav-003-emma',
    full_name: 'Emma Chen',
    role_type: 'minor',
    qr_token_value: 'QR-EMMA-CHEN-WSB2027-G7H8I9',
  },
];

const MOCK_EVENTS: ItineraryEvent[] = [
  {
    event_id: 'evt-001',
    name: 'Hotel Check-in',
    event_type: 'hotel_checkin',
    date: '2027-06-15',
    start_time: '2027-06-15T14:00:00+08:00',
    end_time: null,
    location: 'The Peninsula Beijing',
    description: 'Check in at the front desk. Your room key and welcome packet will be ready.',
  },
  {
    event_id: 'evt-002',
    name: 'Welcome Reception',
    event_type: 'ceremony',
    date: '2027-06-15',
    start_time: '2027-06-15T18:00:00+08:00',
    end_time: '2027-06-15T21:00:00+08:00',
    location: 'Grand Ballroom, The Peninsula Beijing',
    description: 'Opening ceremony and welcome cocktails. Business casual attire.',
  },
  {
    event_id: 'evt-003',
    name: 'Great Wall Excursion',
    event_type: 'activity',
    date: '2027-06-16',
    start_time: '2027-06-16T08:00:00+08:00',
    end_time: '2027-06-16T16:00:00+08:00',
    location: 'Hotel Lobby (Bus Departure)',
    description: 'Full-day trip to the Mutianyu section of the Great Wall. Wear comfortable shoes and bring sunscreen.',
  },
  {
    event_id: 'evt-004',
    name: 'Peking Duck Dinner',
    event_type: 'meal',
    date: '2027-06-16',
    start_time: '2027-06-16T19:00:00+08:00',
    end_time: '2027-06-16T21:30:00+08:00',
    location: 'Quanjude Restaurant, Qianmen',
    description: 'Traditional Peking duck dinner at Beijing\'s most famous duck restaurant, est. 1864.',
  },
  {
    event_id: 'evt-005',
    name: 'Forbidden City Tour',
    event_type: 'activity',
    date: '2027-06-17',
    start_time: '2027-06-17T09:00:00+08:00',
    end_time: '2027-06-17T13:00:00+08:00',
    location: 'Tiananmen Square (South Gate)',
    description: 'Guided tour of the Imperial Palace. Photography permitted in outdoor areas.',
  },
  {
    event_id: 'evt-006',
    name: 'Gala Dinner',
    event_type: 'ceremony',
    date: '2027-06-17',
    start_time: '2027-06-17T19:00:00+08:00',
    end_time: '2027-06-17T23:00:00+08:00',
    location: 'Great Hall of the People',
    description: 'Black-tie gala dinner. Formal attire required.',
  },
  {
    event_id: 'evt-007',
    name: 'Airport Transfer',
    event_type: 'bus',
    date: '2027-06-18',
    start_time: '2027-06-18T10:00:00+08:00',
    end_time: null,
    location: 'Hotel Lobby',
    description: 'Shuttle bus to Beijing Capital International Airport (PEK). Please check out by 9:30 AM.',
  },
];
