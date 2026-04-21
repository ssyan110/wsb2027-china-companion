# Bugfix Requirements Document

## Introduction

The WSB 2027 China Digital Companion application has 23 identified issues from a comprehensive project review (docs/PROJECT-REVIEW-REPORT.md) that will cause failures during a 3,000-traveler live event operation. Issues range from critical scanner failures and data loss to performance bottlenecks and missing functionality. The root cause is rapid feature development without comprehensive integration testing and operational readiness validation. This document captures the bug conditions, expected corrections, and preservation requirements for all 23 issues organized by priority.

## Bug Analysis

### Current Behavior (Defect)

**🔴 CRITICAL Issues (1-5)**

1.1 WHEN a staff member opens the QR scanner page (`OpsScanner`) and scans a QR code within the first 2-5 seconds THEN the system shows "Not Found" because the QR token map (`qrMap`) has not finished loading from `/api/v1/admin/qr-map`, and scanning is not blocked during the loading period

1.2 WHEN a staff member scans a QR code and checks in a traveler THEN the check-in result is stored only in the browser's `scannedRef` (a local `Set<string>`) and is never persisted to the database — the `checkin_status` field in the `travelers` table and `event_attendance.attended` column are never updated

1.3 WHEN a super admin clicks "Add Flight", "Edit Flight", "Add Hotel", or "Edit Hotel" buttons in the ops panel flights/hotels pages THEN the system calls API endpoints (`POST /api/v1/admin/flights`, `PATCH /api/v1/admin/flights/:id`) that do not exist in the backend router, resulting in 404 errors

1.4 WHEN the booking lookup endpoint (`/api/v1/auth/booking-lookup`) is called THEN no rate limiting is applied because Redis is not connected (`null` is passed to `createAuthRouter`) and the in-memory fallback does not exist, allowing unlimited brute-force attempts on booking IDs

1.5 WHEN a traveler clicks the "Email Sign In" tab on the login page and submits their email THEN the magic link email is never delivered because no email service (e.g., SendGrid) is configured — the `emailService.sendMagicLink()` call silently fails or throws

**🟡 HIGH Issues (6-13)**

1.6 WHEN the admin master list is queried for 3,000+ travelers THEN the query joins 9 CTEs (`traveler_groups_agg`, `traveler_hotels_agg`, `room_assignments_agg`, `arrival_flight_agg`, `departure_flight_agg`, `event_attendance_agg`, `traveler_flights_agg`, `traveler_buses_agg`, `traveler_qr`) producing response times of 5-10 seconds due to N+1-like aggregation patterns and missing indexes

1.7 WHEN the QR scanner loads THEN it fetches ALL QR tokens at once via `GET /api/v1/admin/qr-map` (potentially 3,000+ entries), causing a large payload download and 5+ second load time on mobile devices with no local caching or delta sync mechanism

1.8 WHEN an admin revokes a traveler's QR token THEN the traveler's phone continues to display the old cached QR code from IndexedDB/service worker cache because there is no cache invalidation or token validity check on app open

1.9 WHEN a CSV file with 1,000 rows is imported and any row fails validation (e.g., duplicate email at row 500) THEN the entire transaction rolls back via `bulkInsertTravelers` wrapping all inserts in a single `BEGIN/COMMIT` block, showing "0 imported" with no per-row error granularity

1.10 WHEN a user logs out THEN the JWT token remains valid until its 24-hour expiry because `logout()` in `auth.service.ts` is a no-op (`// Client-side token removal — no server-side state to invalidate`) and no token blacklist exists

1.11 WHEN an admin account is deleted from the `travelers` table THEN all associated audit log entries are cascade-deleted because `audit_logs.actor_id` has a foreign key with implicit `CASCADE` behavior (no explicit `ON DELETE` clause defaults to RESTRICT, but the schema uses `NOT NULL REFERENCES travelers(traveler_id)` which will block deletion — however if a workaround delete is used, audit trail is lost)

1.12 WHEN a super admin performs destructive actions (delete traveler, change check-in status, force check-in override) THEN no confirmation dialog is shown — the action executes immediately on click

1.13 WHEN two staff members scan the same traveler at different check-in points THEN both show "Checked In" because the `scannedRef` set is local to each browser instance with no cross-device synchronization or server-side duplicate check

**🟢 MEDIUM Issues (14-23)**

1.14 WHEN a traveler navigates to toolkit pages (Taxi Card, Phrasebook, Currency Converter, Emergency Info) THEN the pages display minimal or hardcoded placeholder content not specific to Beijing/China 2027

1.15 WHEN a traveler opens the Family Wallet page while offline and has never synced family data THEN the family wallet shows empty because family member data only loads via API call with no pre-sync on first login

1.16 WHEN an admin views traveler records THEN phone numbers are displayed in plain text while emails are masked — the `field-masker` utility does not include phone in the PII masking list

1.17 WHEN state-changing API requests (POST, PATCH, DELETE) are made THEN no CSRF token validation occurs because no CSRF middleware is configured in the Express middleware chain

1.18 WHEN queries filter on `traveler_flights.direction`, `event_attendance.event_id`, or `room_assignments.room_assignment_seq` THEN full table scans occur because no database indexes exist on these frequently-queried columns

1.19 WHEN two travelers in different hotels are assigned the same `room_assignment_seq` value THEN the UI incorrectly groups them as roommates because there is no composite unique constraint on `(hotel_id, room_assignment_seq)` in the `room_assignments` table

1.20 WHEN an admin needs to mark travelers as attended or no-show for a specific event THEN there is no UI or API endpoint to update the `event_attendance.attended` column

1.21 WHEN the auto-dispatch service (`dispatch.service.ts`) is invoked THEN there is no test coverage to validate its correctness and no UI in the ops panel to trigger or monitor dispatch operations

1.22 WHEN a super admin exports the master list as CSV THEN the export is missing fields `smd_name`, `ceo_name`, and `photo_url` that were added in the 002 schema migration

1.23 WHEN a super admin edits a cell inline in the master table THEN the entire table data is refetched via `fetchData()`, and if the sort order causes the edited row to move position, the user loses visual context of what they just edited

### Expected Behavior (Correct)

**🔴 CRITICAL Issues (1-5)**

2.1 WHEN a staff member opens the QR scanner page THEN the system SHALL block scanning and display a loading indicator until the QR token map has fully loaded, and SHALL only enable the camera/scan functionality after `qrMapLoading` is `false` and `qrMap.size > 0`

2.2 WHEN a staff member scans a QR code and checks in a traveler THEN the system SHALL POST the scan result to the backend (via the existing `ingestScanBatch` endpoint or a new check-in endpoint), SHALL update `travelers.checkin_status` to `'checked_in'`, and SHALL update `event_attendance.attended` to `true` for the relevant event

2.3 WHEN a super admin submits flight or hotel create/edit forms in the ops panel THEN the system SHALL successfully call backend endpoints that create or update flight and hotel records, returning the created/updated entity

2.4 WHEN the booking lookup endpoint receives requests THEN the system SHALL enforce rate limiting using an in-memory rate limiter (when Redis is unavailable) that limits to 5 attempts per IP per 30-minute window, returning HTTP 429 when exceeded

2.5 WHEN the login page is rendered THEN the system SHALL either configure a working email service for magic link delivery OR remove/disable the "Email Sign In" tab to prevent user confusion, defaulting to "Find My Booking" as the only sign-in method

**🟡 HIGH Issues (6-13)**

2.6 WHEN the admin master list is queried THEN the system SHALL return results within 2 seconds for 3,000 travelers by adding appropriate database indexes on join columns and optimizing the CTE-based query

2.7 WHEN the QR scanner loads THEN the system SHALL cache the QR token map in localStorage/IndexedDB after first fetch and SHALL use delta sync (requesting only tokens updated since the last sync version) for subsequent loads

2.8 WHEN a traveler opens the app THEN the system SHALL check the validity of the cached QR token against the server (or use a cache TTL) and SHALL display a clear message if the token has been revoked, prompting the traveler to contact staff

2.9 WHEN a CSV file is imported THEN the system SHALL process each row individually, inserting valid rows and skipping failed rows, and SHALL return a detailed report listing the count of successfully imported rows and per-row errors with row numbers and failure reasons

2.10 WHEN a user logs out THEN the system SHALL invalidate the session token server-side (via a token blacklist in memory or Redis, or by using short-lived tokens with a refresh token mechanism) so the token cannot be reused on shared devices

2.11 WHEN an admin account is deleted THEN the system SHALL preserve all associated audit log entries by changing the `audit_logs.actor_id` foreign key to `ON DELETE SET NULL` and making the column nullable, ensuring compliance audit trail is maintained

2.12 WHEN a super admin initiates a destructive action (delete traveler, status change, force check-in) THEN the system SHALL display a confirmation dialog describing the action and requiring explicit user confirmation before executing

2.13 WHEN a staff member scans a traveler THEN the system SHALL check the server-side scan log for existing check-ins before recording a new one, and SHALL display "Already Checked In" with the original scan timestamp and device if a duplicate is detected

**🟢 MEDIUM Issues (14-23)**

2.14 WHEN a traveler navigates to toolkit pages THEN the system SHALL display Beijing-specific content including local taxi information, Mandarin phrasebook entries, CNY currency conversion, and China emergency numbers/embassy contacts

2.15 WHEN a traveler first logs in THEN the system SHALL pre-sync family member data to local storage so the Family Wallet page displays family information even when offline

2.16 WHEN an admin views traveler records THEN the system SHALL mask phone numbers using the same PII masking pattern applied to emails (showing only last 4 digits), unless the admin has explicitly enabled PII unmasking

2.17 WHEN state-changing API requests are made THEN the system SHALL validate a CSRF token on all POST, PATCH, and DELETE endpoints to prevent cross-site request forgery attacks

2.18 WHEN queries filter on `traveler_flights.direction`, `event_attendance.event_id`, or `room_assignments.room_assignment_seq` THEN the system SHALL use database indexes on these columns to ensure sub-second query performance

2.19 WHEN room assignments are created THEN the system SHALL enforce a composite unique constraint on `(hotel_id, room_assignment_seq)` in the `room_assignments` table to prevent cross-hotel roommate grouping errors

2.20 WHEN an admin needs to update event attendance THEN the system SHALL provide an API endpoint (`PATCH /api/v1/admin/event-attendance/:id`) and a UI control to mark travelers as attended or no-show for specific events

2.21 WHEN the auto-dispatch service is used THEN the system SHALL have comprehensive test coverage validating dispatch logic and SHALL expose dispatch controls in the ops panel UI

2.22 WHEN a super admin exports the master list as CSV THEN the export SHALL include all 002-schema fields including `smd_name`, `ceo_name`, and `photo_url`

2.23 WHEN a super admin edits a cell inline in the master table THEN the system SHALL use optimistic UI updates to immediately reflect the change locally, and SHALL visually highlight the edited row after any data refresh to maintain user context

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a valid QR code is scanned after the QR map has fully loaded THEN the system SHALL CONTINUE TO correctly identify the traveler and display their check-in status with pass/fail/wrong-fleet results

3.2 WHEN the QR scanner is used in manual search mode (first name + last name lookup) THEN the system SHALL CONTINUE TO find and check in travelers by name with disambiguation by birth year for duplicate names

3.3 WHEN a super admin performs CRUD operations on travelers, groups, events, and buses via existing working endpoints THEN the system SHALL CONTINUE TO create, read, update, and delete these entities correctly

3.4 WHEN a traveler logs in via the "Find My Booking" tab with valid booking ID and last name THEN the system SHALL CONTINUE TO authenticate successfully and return a valid JWT session token

3.5 WHEN the master list is queried with search, filter, sort, and pagination parameters THEN the system SHALL CONTINUE TO return correctly filtered, sorted, and paginated results with PII masking and role-based field projection

3.6 WHEN a super admin edits traveler fields via the inline editor THEN the system SHALL CONTINUE TO persist changes via `PATCH /api/v1/admin/travelers/:id` with audit logging of field-level changes

3.7 WHEN CSV files are imported with all valid rows THEN the system SHALL CONTINUE TO import all travelers with QR token generation and return the correct import count

3.8 WHEN the ops panel pages (Rooms, Flights, Events, Audit Log) are accessed THEN the system SHALL CONTINUE TO display data correctly with existing drill-down, grouping, and filtering functionality

3.9 WHEN QR tokens are reissued via `/api/v1/admin/qr/reissue` THEN the system SHALL CONTINUE TO revoke the old token and generate a new one with proper audit logging

3.10 WHEN role-based access control is enforced THEN the system SHALL CONTINUE TO restrict admin-only endpoints to admin and super_admin roles, and restrict editing to super_admin only

3.11 WHEN the wrong fleet detection fires during scanning THEN the system SHALL CONTINUE TO show the Deny/Force prompt allowing staff to override or reject the check-in

3.12 WHEN notifications are sent via SSE THEN the system SHALL CONTINUE TO deliver real-time notifications to connected clients

3.13 WHEN the PWA is installed and used offline THEN the system SHALL CONTINUE TO display cached QR codes, itinerary data, and core navigation without network connectivity
