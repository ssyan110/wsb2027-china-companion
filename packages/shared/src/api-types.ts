// WSB 2027 China Companion — API Request/Response Types

import type { RoleType, AccessStatus, EventType, NotificationTarget } from './enums';

// ─── Auth Service ────────────────────────────────────────────

export interface MagicLinkRequest {
  email: string;
}

export interface MagicLinkResponse {
  success: boolean;
}

export interface VerifyResponse {
  session_token: string;
  traveler_id: string;
  role_type: RoleType;
}

export interface VerifyError {
  error: 'expired' | 'used' | 'invalid';
}

export interface BookingLookupRequest {
  booking_id: string;
  last_name: string;
}

export interface BookingLookupResponse {
  session_token: string;
  traveler_id: string;
}

export interface RefreshResponse {
  session_token: string;
  expires_at: string;
}

// ─── Traveler Service ────────────────────────────────────────

export interface TravelerProfile {
  traveler_id: string;
  full_name: string;
  email: string;
  role_type: RoleType;
  access_status: AccessStatus;
  family_id: string | null;
  group_ids: string[];
  hotel: {
    hotel_id: string;
    name: string;
    address_en: string;
    address_cn: string;
  } | null;
  qr_token: string;
}

export interface FamilyMember {
  traveler_id: string;
  full_name: string;
  role_type: RoleType;
  qr_token_value: string;
}

export interface FamilyResponse {
  family_id: string;
  members: FamilyMember[];
}

export interface ItineraryEvent {
  event_id: string;
  name: string;
  event_type: EventType;
  date: string;
  start_time: string;
  end_time: string | null;
  location: string;
  description: string | null;
}

export interface ItineraryResponse {
  events: ItineraryEvent[];
}

export interface NotificationItem {
  notification_id: string;
  title: string;
  body: string;
  published_at: string;
  read_at: string | null;
}

export interface NotificationsResponse {
  notifications: NotificationItem[];
}

// ─── Scan Service ────────────────────────────────────────────

export interface ManifestTraveler {
  qr_token_value: string;
  traveler_id: string;
  full_name: string;
  family_id: string | null;
  role_type: RoleType;
  eligibility: string[];
}

export interface ManifestResponse {
  travelers: ManifestTraveler[];
  version: string;
}

export interface ScanEntry {
  qr_token_value: string;
  scan_mode: string;
  result: 'pass' | 'fail' | 'wrong_assignment' | 'override';
  override_reason?: string;
  device_id: string;
  scanned_at: string;
}

export interface ScanBatchRequest {
  scans: ScanEntry[];
}

export interface ScanMode {
  mode_id: string;
  name: string;
  event_id: string;
  event_type: EventType;
}

export interface ScanModesResponse {
  modes: ScanMode[];
}

// ─── Dispatch Engine ─────────────────────────────────────────

export interface DispatchRequest {
  event_id: string;
}

export interface DispatchProposal {
  proposed_assignments: Array<{
    traveler_id: string;
    bus_id: string;
    bus_number: string;
  }>;
}

export interface DispatchCommitRequest {
  assignments: Array<{
    traveler_id: string;
    bus_id: string;
  }>;
}

// ─── Fuzzy Search ────────────────────────────────────────────

export interface SearchCandidate {
  traveler_id: string;
  full_name: string;
  email: string;
  booking_id: string;
  family_id: string | null;
  access_status: AccessStatus;
  match_score: number;
}

export interface SearchResponse {
  candidates: SearchCandidate[];
}

// ─── Notification Service ────────────────────────────────────

export interface NotificationRequest {
  title: string;
  body: string;
  target_type: NotificationTarget;
  target_id?: string;
}

// ─── Admin Service ───────────────────────────────────────────

export interface ImportError {
  row: number;
  field: string;
  reason: string;
}

export interface ImportResponse {
  imported: number;
  errors: ImportError[];
}

export interface ReissueRequest {
  traveler_id: string;
}

export interface ReissueResponse {
  new_qr_token_value: string;
}

// ─── Audit Service ───────────────────────────────────────────

export interface AuditEntry {
  actor_id: string;
  actor_role: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown>;
}

export interface AuditLogEntry {
  audit_id: string;
  actor_id: string;
  actor_role: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface AuditLogResponse {
  entries: AuditLogEntry[];
  total: number;
  page: number;
  page_size: number;
}

// ─── Admin Master List ───────────────────────────────────────

export interface MasterListRow {
  traveler_id: string;
  booking_id: string | null;
  family_id: string | null;
  representative_id: string | null;
  guardian_id?: string | null;       // omitted for admin role
  full_name_raw: string;
  full_name_normalized: string;
  email_primary: string;
  email_aliases?: string[] | null;   // omitted for admin role
  passport_name: string | null;
  phone: string | null;
  role_type: RoleType;
  access_status: AccessStatus;
  created_at: string;
  updated_at: string;
  groups: string[];
  hotels: string[];
  flights: { flight_number: string; arrival_time: string }[];
  bus_assignments: { bus_number: string; event_name: string }[];
  qr_active: boolean;
}

export interface MasterListResponse {
  data: MasterListRow[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface MasterListQueryParams {
  page?: number;
  page_size?: number;
  q?: string;
  role_type?: RoleType;
  access_status?: AccessStatus;
  group_id?: string;
  hotel_id?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  unmask?: boolean;
}

// ─── Admin Panel Extended Types ──────────────────────────────

export interface RoomAssignment {
  room_number: string | null;
  room_assignment_seq: number | null;
  hotel_confirmation_no: string | null;
  occupancy: 'single' | 'double' | 'twin' | 'triple' | null;
  paid_room_type: string | null;
  preferred_roommates: string | null;
  is_paid_room: boolean;
  hotel_name: string | null;
}

export interface FlightDetail {
  airline: string | null;
  flight_number: string;
  time: string;
  airport: string | null;
  terminal: string | null;
}

export interface EventAttendanceItem {
  event_name: string;
  fleet_number: string | null;
  attended: boolean | null;
}

export interface ExtendedMasterListRow extends MasterListRow {
  // New scalar fields from 002 migration
  first_name: string | null;
  last_name: string | null;
  gender: 'male' | 'female' | 'other' | 'undisclosed' | null;
  age: number | null;
  invitee_type: 'invitee' | 'guest' | null;
  registration_type: string | null;
  pax_type: 'adult' | 'child' | 'infant';
  vip_tag: string | null;
  internal_id: string | null;
  agent_code: string | null;
  party_total: number | null;
  party_adults: number | null;
  party_children: number | null;
  dietary_vegan: boolean;
  dietary_notes: string | null;
  remarks: string | null;
  repeat_attendee: number;
  jba_repeat: boolean;
  checkin_status: 'pending' | 'checked_in' | 'no_show';
  onsite_flight_change: boolean;
  smd_name: string | null;
  ceo_name: string | null;
  photo_url: string | null;

  // Structured related data
  room_assignment: RoomAssignment | null;
  arrival_flight: FlightDetail | null;
  departure_flight: FlightDetail | null;
  event_attendance: EventAttendanceItem[];
}

export interface ExtendedMasterListQueryParams extends MasterListQueryParams {
  invitee_type?: 'invitee' | 'guest';
  pax_type?: 'adult' | 'child' | 'infant';
  checkin_status?: 'pending' | 'checked_in' | 'no_show';
  vip_tag?: string;
  agent_code?: string;
}

// ─── Common Error Envelope ───────────────────────────────────

export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
}

// ─── Session Token (JWT payload) ─────────────────────────────

export interface SessionPayload {
  sub: string;
  role: RoleType;
  family_id?: string;
  iat: number;
  exp: number;
}
