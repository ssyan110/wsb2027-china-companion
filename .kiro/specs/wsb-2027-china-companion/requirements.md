# Requirements Document

## Introduction

WSB 2027 China Digital Companion is an installable PWA-first tour operations platform designed to serve 3,000+ international travelers attending the WSB 2027 China incentive event. The platform delivers fast identity access via QR codes, personalized itinerary delivery, family/minor management, offline-first staff scanning, and high-volume event logistics. The product removes app-store dependency and the requirement for each traveler to individually log in on their own device.

## Glossary

- **Companion_App**: The installable PWA-first client application built with React + Vite, serving travelers, family representatives, and staff
- **Backend_API**: The Node.js / TypeScript backend services exposing REST endpoints over PostgreSQL
- **Traveler**: An adult participant who can view their own QR, itinerary, and travel toolkit
- **Family_Representative**: A parent or lead traveler who can view and manage QR codes and itineraries for all linked family members including minors
- **Minor_Dependent**: A child or no-phone traveler linked to a guardian; does not require independent login
- **Staff_Scanner**: Airport, hotel, or event staff who scan and validate traveler QR codes using offline-capable devices
- **Staff_Desk**: Rescue desk staff who perform fuzzy search, retrieve traveler profiles, reissue access, and display QR codes
- **Admin_Console**: The central operations interface for importing data, managing assignments, dispatching buses, and editing group rules
- **Super_Admin**: Platform owner with tenant settings, integrations, and permission control
- **QR_Token**: A unique, dynamically generated token per traveler used for identity verification at scan points
- **Magic_Link**: A passwordless email-based authentication link that grants access without app-store install or traditional login
- **Manifest**: A preloaded dataset on staff devices containing traveler eligibility data for offline local validation
- **Fuzzy_Search**: A search algorithm that tolerates imperfect input including missing middle names, spacing variations, casing differences, and partial email matches
- **Family_ID**: A shared identifier linking related travelers within a family group
- **Booking_ID**: A shared reservation or registration reference from the upstream registration platform
- **Scan_Mode**: A context setting on staff devices specifying the current operational context (e.g., Bus 05, Gala, K-Day, Hotel check-in)
- **Dispatch_Engine**: The auto-dispatch algorithm that assigns travelers to buses based on flight times, terminal grouping, and family-preserving rules
- **Itinerary_Engine**: The system that renders personalized schedules filtered by group, role, option, hotel, and assignment
- **Sync_Queue**: A local queue on staff devices that stores unsynced scan logs for deferred upload when connectivity returns
- **IndexedDB_Cache**: The client-side IndexedDB storage layer used for offline data persistence
- **Normalized_Name**: A search-friendly transformation of a traveler's raw name, stripped of diacritics, extra spaces, and casing variations

---

## Requirements

---

### Requirement 1: Email Magic Link Authentication

**User Story:** As a Traveler, I want to receive a magic link via email so that I can access my QR code and itinerary without downloading a native app or remembering a password.

#### Acceptance Criteria

1. WHEN a Traveler submits a valid email address, THE Backend_API SHALL generate a single-use Magic_Link and send it to the provided email within 10 seconds
2. WHEN a Traveler opens a valid Magic_Link, THE Companion_App SHALL authenticate the Traveler and redirect to the home screen within 3 seconds
3. WHEN a Traveler opens an expired Magic_Link (older than 24 hours), THE Companion_App SHALL display an expiration message and offer a resend option
4. WHEN a Traveler opens a previously used Magic_Link, THE Companion_App SHALL display an "already used" message and offer a resend option
5. IF the email address does not match any Traveler record, THEN THE Backend_API SHALL return a generic "link sent" response without revealing whether the email exists
6. THE Backend_API SHALL rate-limit magic link requests to a maximum of 5 per email address per hour

---

### Requirement 2: Booking Lookup Access

**User Story:** As a Traveler, I want to look up my booking using my Booking_ID and last name so that I can access my profile if I cannot find my magic link email.

#### Acceptance Criteria

1. WHEN a Traveler submits a valid Booking_ID and matching last name, THE Backend_API SHALL authenticate the Traveler and return a session token
2. WHEN a Traveler submits a Booking_ID that does not match the provided last name, THE Backend_API SHALL return a generic error without revealing which field was incorrect
3. THE Backend_API SHALL normalize the submitted last name (trim whitespace, lowercase, strip diacritics) before comparison
4. IF a Traveler fails booking lookup 5 times within 15 minutes, THEN THE Backend_API SHALL temporarily lock lookup for that IP address for 30 minutes

---

### Requirement 3: Staff-Assisted Access Recovery

**User Story:** As a Staff_Desk operator, I want to search for a traveler using fuzzy name or partial email so that I can recover their access quickly when they cannot self-serve.

#### Acceptance Criteria

1. WHEN a Staff_Desk operator enters a partial name (minimum 2 characters), THE Backend_API SHALL return a ranked list of matching Traveler candidates within 500 milliseconds
2. WHEN a Staff_Desk operator enters a partial email (minimum 3 characters), THE Backend_API SHALL return a ranked list of matching Traveler candidates within 500 milliseconds
3. THE Fuzzy_Search SHALL tolerate missing middle names, spacing variations, casing differences, and common transliteration variants
4. WHEN a Staff_Desk operator selects a Traveler from the candidate list, THE Admin_Console SHALL display the full Traveler profile including QR_Token, Family_ID, and access status
5. WHEN a Staff_Desk operator triggers access recovery for a Traveler, THE Backend_API SHALL generate a new Magic_Link and send it to the Traveler's email_primary
6. THE Backend_API SHALL log every staff search query, selected candidate, and recovery action with timestamp and staff identifier

---

### Requirement 4: Family Representative Linking

**User Story:** As a Family_Representative, I want to be linked to my family members including minors so that I can manage QR codes and itineraries for the entire family from one device.

#### Acceptance Criteria

1. THE Backend_API SHALL support linking multiple Travelers under a single Family_ID
2. THE Backend_API SHALL require exactly one representative_id per Family_ID
3. WHEN a Family_Representative authenticates, THE Companion_App SHALL display all linked family members on the home screen
4. WHEN a Minor_Dependent is linked to a guardian_id, THE Backend_API SHALL make the Minor_Dependent's QR_Token accessible through the guardian's family wallet
5. IF a Family_Representative is unlinked or changed, THEN THE Backend_API SHALL revoke the previous representative's access to linked member QR_Tokens within 60 seconds
6. THE Backend_API SHALL prevent a Minor_Dependent from being linked to more than one guardian_id at a time

---

### Requirement 5: Personal QR Code Display

**User Story:** As a Traveler, I want to view my personal QR code on my device so that I can present it for scanning at buses, meals, hotels, and events.

#### Acceptance Criteria

1. WHEN an authenticated Traveler opens the QR screen, THE Companion_App SHALL display the Traveler's QR_Token as a scannable QR code within 1 second
2. THE Companion_App SHALL render the QR code at a minimum size of 200x200 pixels with high contrast for reliable scanning
3. THE Companion_App SHALL display the Traveler's full name below the QR code for visual staff verification
4. WHILE the QR screen is active, THE Companion_App SHALL increase screen brightness to maximum and prevent screen timeout
5. THE Companion_App SHALL cache the QR_Token in IndexedDB_Cache so the QR code is displayable without network connectivity
6. WHEN the QR_Token is reissued by an admin, THE Companion_App SHALL update the cached token on next sync within 30 seconds of connectivity

---

### Requirement 6: Family QR Wallet

**User Story:** As a Family_Representative, I want to view and cycle through QR codes for all my linked family members so that I can present them sequentially at scan points.

#### Acceptance Criteria

1. WHEN a Family_Representative opens the family wallet, THE Companion_App SHALL display a list of all linked family members with their names and roles
2. WHEN a Family_Representative selects a family member, THE Companion_App SHALL display that member's QR code at full scannable size
3. THE Companion_App SHALL provide swipe or next/previous navigation to cycle through family member QR codes sequentially
4. THE Companion_App SHALL cache all linked family member QR_Tokens in IndexedDB_Cache for offline display
5. THE Companion_App SHALL display a visual indicator showing the current member position (e.g., "2 of 4") during sequential display

---

### Requirement 7: Personalized Itinerary Display

**User Story:** As a Traveler, I want to view my personalized schedule so that I know exactly where I need to be and when, based on my group, options, and assignments.

#### Acceptance Criteria

1. WHEN an authenticated Traveler opens the itinerary screen, THE Companion_App SHALL display only the events relevant to the Traveler's group, option selections, hotel assignment, and role
2. THE Itinerary_Engine SHALL filter events based on group_id, option_id, hotel_id, and role_type
3. WHEN an operational update is published, THE Companion_App SHALL reflect the updated itinerary within 60 seconds when online
4. THE Companion_App SHALL display each itinerary event with date, time, location, and description
5. THE Companion_App SHALL cache the personalized itinerary in IndexedDB_Cache for offline viewing
6. WHILE the Traveler is offline, THE Companion_App SHALL display the last cached itinerary with a visible "last updated" timestamp



---

### Requirement 8: Real-Time Notifications

**User Story:** As a Traveler, I want to receive real-time notifications about bus departures, meeting point changes, and schedule updates so that I stay informed during the event.

#### Acceptance Criteria

1. WHEN an Admin publishes a notification, THE Companion_App SHALL display the notification to targeted Travelers within 30 seconds when online
2. THE Backend_API SHALL support targeting notifications by group_id, hotel_id, bus_assignment, or individual traveler_id
3. THE Companion_App SHALL store received notifications in IndexedDB_Cache and display them in a notification history list
4. WHEN a Traveler opens the Companion_App after being offline, THE Companion_App SHALL fetch and display any missed notifications
5. THE Companion_App SHALL display a badge count for unread notifications on the navigation bar

---

### Requirement 9: Destination Toolkit — Taxi Card

**User Story:** As a Traveler, I want to view a taxi card with my hotel address in the local language so that I can show it to a taxi driver who does not speak English.

#### Acceptance Criteria

1. WHEN a Traveler opens the taxi card, THE Companion_App SHALL display the Traveler's assigned hotel name and address in both English and Simplified Chinese
2. THE Companion_App SHALL display the taxi card text at a minimum font size of 24pt for readability
3. THE Companion_App SHALL cache the taxi card content in IndexedDB_Cache for offline display
4. WHEN a Traveler's hotel assignment changes, THE Companion_App SHALL update the taxi card on next sync

---

### Requirement 10: Destination Toolkit — Phrasebook

**User Story:** As a Traveler, I want to access a phrasebook with common phrases in the local language so that I can communicate basic needs during the trip.

#### Acceptance Criteria

1. THE Companion_App SHALL display a categorized list of common travel phrases in English with Simplified Chinese translations and Pinyin romanization
2. THE Companion_App SHALL provide text-to-speech playback for each Chinese phrase
3. THE Companion_App SHALL cache all phrasebook content in IndexedDB_Cache for offline access
4. THE Companion_App SHALL organize phrases into categories: Greetings, Directions, Food, Emergency, Shopping, and Transportation

---

### Requirement 11: Destination Toolkit — Currency Converter

**User Story:** As a Traveler, I want a simple currency converter so that I can quickly understand local prices in my home currency.

#### Acceptance Criteria

1. WHEN a Traveler enters an amount in CNY, THE Companion_App SHALL display the equivalent in USD using the last fetched exchange rate
2. WHEN a Traveler enters an amount in USD, THE Companion_App SHALL display the equivalent in CNY using the last fetched exchange rate
3. THE Companion_App SHALL fetch and cache the exchange rate daily when online
4. WHILE the Traveler is offline, THE Companion_App SHALL use the last cached exchange rate and display the date it was fetched

---

### Requirement 12: Offline-First Staff QR Scanning

**User Story:** As a Staff_Scanner, I want to validate traveler QR codes locally on my device in milliseconds so that boarding and check-in lines move quickly even without internet.

#### Acceptance Criteria

1. THE Staff_Scanner device SHALL preload the Manifest containing all traveler QR_Tokens and eligibility data before the start of each operational shift
2. WHEN a Staff_Scanner scans a QR code, THE Companion_App SHALL validate the QR_Token against the local Manifest and return a result within 300 milliseconds
3. WHEN a valid QR_Token is scanned, THE Companion_App SHALL display a green confirmation screen with the Traveler's name and eligibility status
4. WHEN an invalid or unrecognized QR_Token is scanned, THE Companion_App SHALL display a red rejection screen with an "Unknown QR" message
5. THE Companion_App SHALL store each scan result (timestamp, QR_Token, scan_mode, result, staff_id) in the Sync_Queue
6. WHEN network connectivity is restored, THE Companion_App SHALL upload all queued scan results to the Backend_API within 60 seconds

---

### Requirement 13: Context-Aware Scan Mode

**User Story:** As a Staff_Scanner, I want to set my scanning context (e.g., Bus 05, Gala Dinner, Hotel Check-in) so that the system checks traveler eligibility for the specific event or transport.

#### Acceptance Criteria

1. WHEN a Staff_Scanner selects a Scan_Mode, THE Companion_App SHALL filter the local Manifest to the eligibility list for that specific context
2. THE Companion_App SHALL display the active Scan_Mode prominently on the scan screen at all times
3. WHEN a Staff_Scanner scans a QR_Token for a Traveler who is not eligible for the active Scan_Mode, THE Companion_App SHALL display a red "Wrong Assignment" alert screen with an audible warning sound
4. WHEN a Staff_Scanner scans a QR_Token for a Traveler who is eligible for the active Scan_Mode, THE Companion_App SHALL display a green confirmation screen
5. THE Backend_API SHALL provide a list of available Scan_Modes based on the current day's operational schedule

---

### Requirement 14: Wrong-Bus / Wrong-Event Prevention

**User Story:** As a Staff_Scanner, I want the system to alert me immediately when a traveler boards the wrong bus or enters the wrong event so that I can redirect them before departure.

#### Acceptance Criteria

1. WHEN a QR_Token is scanned and the Traveler is not assigned to the active Scan_Mode context, THE Companion_App SHALL display a full-screen red alert with the text "WRONG ASSIGNMENT" and the Traveler's correct assignment
2. THE Companion_App SHALL play an audible alert sound distinct from the confirmation sound when a wrong-assignment scan occurs
3. THE Companion_App SHALL display the Traveler's correct bus number or event name on the alert screen so staff can redirect the Traveler
4. THE Companion_App SHALL log wrong-assignment scans with a distinct event type in the Sync_Queue

---

### Requirement 15: Batch Family Check-In

**User Story:** As a Staff_Scanner, I want to check in an entire family group with one scan of the Family_Representative's QR code so that families can board together quickly.

#### Acceptance Criteria

1. WHEN a Staff_Scanner scans a Family_Representative's QR_Token in batch mode, THE Companion_App SHALL display all linked family members with their eligibility status
2. WHEN a Staff_Scanner confirms batch check-in, THE Companion_App SHALL record a check-in event for each eligible linked family member
3. THE Companion_App SHALL display the count of family members checked in (e.g., "4 of 4 checked in")
4. IF any linked family member is not eligible for the active Scan_Mode, THEN THE Companion_App SHALL highlight that member in red and exclude them from the batch check-in
5. THE Companion_App SHALL allow the Staff_Scanner to override and include an ineligible family member with a mandatory reason code

---

### Requirement 16: Staff Manual Override

**User Story:** As a Staff_Scanner, I want to manually override a scan rejection with a reason code so that I can handle edge cases without blocking operations.

#### Acceptance Criteria

1. WHEN a scan results in a rejection or wrong-assignment alert, THE Companion_App SHALL display an "Override" button
2. WHEN a Staff_Scanner taps Override, THE Companion_App SHALL require selection of a reason code from a predefined list (e.g., "Manager Approved", "Data Error", "VIP Exception", "Emergency")
3. WHEN a Staff_Scanner confirms an override, THE Companion_App SHALL record the override with the reason code, staff_id, and timestamp in the Sync_Queue
4. THE Backend_API SHALL flag all overrides for admin review in the audit log



---

### Requirement 17: Traveler Master Data Management

**User Story:** As an Admin, I want to import and manage traveler records including family links, group assignments, and guardian relationships so that the platform has accurate operational data.

#### Acceptance Criteria

1. WHEN an Admin uploads a CSV file, THE Admin_Console SHALL parse and validate all rows against the traveler data schema before import
2. IF a CSV row fails validation, THEN THE Admin_Console SHALL report the row number, field name, and error reason without aborting the entire import
3. THE Admin_Console SHALL support creating, updating, and deactivating Traveler records individually
4. THE Admin_Console SHALL support linking Travelers to Family_IDs and assigning representative_id and guardian_id relationships
5. THE Backend_API SHALL enforce that every Minor_Dependent has a valid guardian_id before activation
6. THE Backend_API SHALL generate a Normalized_Name for every Traveler record upon creation or update

---

### Requirement 18: Group and Assignment Management

**User Story:** As an Admin, I want to assign travelers to groups, itinerary options, hotels, and bus assignments so that the itinerary engine and scan validation use correct eligibility data.

#### Acceptance Criteria

1. THE Admin_Console SHALL allow creating and editing groups with a group_id, name, and description
2. THE Admin_Console SHALL allow assigning Travelers to one or more groups
3. THE Admin_Console SHALL allow assigning Travelers to itinerary options, hotel assignments, and bus assignments
4. WHEN an assignment is changed, THE Backend_API SHALL update the Manifest and notify affected staff devices within 5 minutes
5. THE Admin_Console SHALL display a summary view showing assignment counts per group, hotel, and bus

---

### Requirement 19: Auto-Dispatch Bus Assignment Engine

**User Story:** As an Admin, I want the system to automatically assign travelers to airport buses based on flight arrival times, terminal, and family grouping so that bus dispatch is efficient and families stay together.

#### Acceptance Criteria

1. WHEN an Admin triggers auto-dispatch, THE Dispatch_Engine SHALL cluster Travelers by arrival terminal and time window
2. THE Dispatch_Engine SHALL assign Travelers to buses optimizing for bus fill rate (target 85-100% capacity)
3. THE Dispatch_Engine SHALL keep all members of a Family_ID on the same bus
4. THE Dispatch_Engine SHALL use a reverse time-window algorithm starting from the latest arrivals
5. WHEN auto-dispatch completes, THE Admin_Console SHALL display the proposed assignments for admin review before committing
6. WHEN an Admin commits dispatch assignments, THE Backend_API SHALL push bus assignments to affected Traveler itineraries and update the Manifest

---

### Requirement 20: Staff Rescue Console

**User Story:** As a Staff_Desk operator, I want a dedicated console to search for travelers, view their profiles, display their QR codes, and recover their access so that I can resolve issues at the help desk quickly.

#### Acceptance Criteria

1. THE Admin_Console SHALL provide a rescue console view accessible to Staff_Desk role users
2. WHEN a Staff_Desk operator searches by name, THE Fuzzy_Search SHALL return ranked candidates matching partial names with tolerance for transliteration, spacing, and casing within 500 milliseconds
3. WHEN a Staff_Desk operator searches by email, THE Fuzzy_Search SHALL return candidates matching partial email addresses within 500 milliseconds
4. WHEN a Staff_Desk operator selects a Traveler, THE Admin_Console SHALL display: full name, email, Booking_ID, Family_ID, group assignments, access_status, and a scannable QR code
5. WHEN a Staff_Desk operator triggers "Resend Magic Link", THE Backend_API SHALL generate and send a new Magic_Link to the Traveler's email_primary
6. WHEN a Staff_Desk operator triggers "Display QR", THE Admin_Console SHALL render the Traveler's QR_Token as a full-screen scannable QR code on the staff device
7. THE Backend_API SHALL log every rescue console action (search, view, resend, display) with staff_id and timestamp

---

### Requirement 21: Audit Logging

**User Story:** As an Admin, I want all operational actions to be logged with timestamps and actor identifiers so that I can audit staff actions, scan history, and access recovery events.

#### Acceptance Criteria

1. THE Backend_API SHALL log every scan event with: timestamp, staff_id, QR_Token, scan_mode, result (pass/fail/override), and device_id
2. THE Backend_API SHALL log every staff rescue action with: timestamp, staff_id, action_type, traveler_id, and details
3. THE Backend_API SHALL log every admin data change with: timestamp, admin_id, entity_type, entity_id, change_type, and before/after values
4. THE Admin_Console SHALL provide a searchable audit log view filterable by date range, action type, staff_id, and traveler_id
5. THE Backend_API SHALL retain audit logs for a minimum of 12 months

---

### Requirement 22: QR Token Reissuance

**User Story:** As an Admin, I want to reissue a traveler's QR token so that I can invalidate a compromised or lost token and generate a new one.

#### Acceptance Criteria

1. WHEN an Admin triggers QR reissuance for a Traveler, THE Backend_API SHALL invalidate the existing QR_Token immediately
2. WHEN a QR_Token is invalidated, THE Backend_API SHALL generate a new QR_Token and associate it with the Traveler record
3. WHEN a new QR_Token is generated, THE Backend_API SHALL update the Manifest so staff devices receive the new token on next sync
4. THE Backend_API SHALL log the reissuance event with admin_id, traveler_id, old token hash, and new token hash
5. WHEN a previously invalidated QR_Token is scanned, THE Companion_App SHALL display a "Token Revoked — Contact Staff" message



---

### Requirement 23: PWA Installation and Delivery

**User Story:** As a Traveler, I want the platform to open instantly from a link and optionally install as an app on my home screen so that I get an app-like experience without visiting an app store.

#### Acceptance Criteria

1. WHEN a Traveler opens the Companion_App URL in a mobile browser, THE Companion_App SHALL load and be fully interactive within 5 seconds on a 3G connection
2. THE Companion_App SHALL serve a valid Web App Manifest with name, icons, theme color, and display mode set to "standalone"
3. WHEN a Traveler's browser supports PWA installation, THE Companion_App SHALL display an install prompt after the first successful authentication
4. WHEN installed, THE Companion_App SHALL launch in standalone mode without browser chrome
5. THE Companion_App SHALL register a Service Worker that caches critical assets for offline access
6. THE Companion_App SHALL pass Lighthouse PWA audit with a score of 90 or above

---

### Requirement 24: Offline Data Persistence

**User Story:** As a Traveler, I want my QR code, itinerary, and toolkit content to be available offline so that I can access essential information even without internet connectivity.

#### Acceptance Criteria

1. THE Companion_App SHALL cache the following data in IndexedDB_Cache upon successful authentication: QR_Token, personalized itinerary, taxi card, phrasebook, and notification history
2. WHILE the Companion_App is offline, THE Companion_App SHALL serve all cached data without error screens
3. WHEN the Companion_App regains connectivity, THE Companion_App SHALL sync updated data from the Backend_API within 60 seconds
4. THE Companion_App SHALL display a visible offline indicator in the navigation bar when no network is detected
5. THE Companion_App SHALL display "last synced" timestamps on the itinerary and notification screens

---

### Requirement 25: Manifest Preload and Sync for Staff

**User Story:** As a Staff_Scanner, I want my device to preload the full traveler manifest before my shift so that I can validate scans locally without depending on network connectivity.

#### Acceptance Criteria

1. WHEN a Staff_Scanner initiates manifest sync, THE Companion_App SHALL download the full Manifest from the Backend_API and store it in IndexedDB_Cache
2. THE Manifest SHALL contain: QR_Token, traveler_id, full_name, family_id, role_type, and eligibility arrays per scan_mode context
3. THE Companion_App SHALL display manifest sync progress and completion status
4. WHEN the Manifest is older than 4 hours, THE Companion_App SHALL display a warning prompting the Staff_Scanner to re-sync
5. THE Backend_API SHALL support delta sync so that only changed records are transmitted after the initial full sync
6. THE Manifest download SHALL complete within 30 seconds for 5,000 traveler records on a 4G connection

---

## Technical Requirements

---

### Requirement 26: Database Schema — Identity and Access

**User Story:** As a developer, I want a well-defined database schema for traveler identity and access so that all modules operate on consistent, normalized data.

#### Acceptance Criteria

1. THE Backend_API database SHALL include a `travelers` table with columns: `traveler_id` (UUID, PK), `booking_id` (VARCHAR, indexed), `family_id` (UUID, FK nullable, indexed), `representative_id` (UUID, FK nullable), `guardian_id` (UUID, FK nullable), `full_name_raw` (VARCHAR NOT NULL), `full_name_normalized` (VARCHAR NOT NULL, indexed), `email_primary` (VARCHAR NOT NULL, unique, indexed), `email_aliases` (VARCHAR[] nullable), `passport_name` (VARCHAR nullable), `phone` (VARCHAR nullable), `role_type` (ENUM: traveler, minor, representative, staff), `access_status` (ENUM: invited, activated, linked, rescued), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ)
2. THE Backend_API database SHALL include a `families` table with columns: `family_id` (UUID, PK), `representative_id` (UUID, FK NOT NULL, references travelers), `created_at` (TIMESTAMPTZ)
3. THE Backend_API database SHALL include a `qr_tokens` table with columns: `token_id` (UUID, PK), `traveler_id` (UUID, FK NOT NULL, unique, indexed), `token_value` (VARCHAR NOT NULL, unique, indexed), `is_active` (BOOLEAN DEFAULT true), `issued_at` (TIMESTAMPTZ), `revoked_at` (TIMESTAMPTZ nullable)
4. THE Backend_API database SHALL include a `magic_links` table with columns: `link_id` (UUID, PK), `traveler_id` (UUID, FK NOT NULL), `token` (VARCHAR NOT NULL, unique, indexed), `expires_at` (TIMESTAMPTZ NOT NULL), `used_at` (TIMESTAMPTZ nullable), `created_at` (TIMESTAMPTZ)
5. THE Backend_API database SHALL enforce referential integrity: `families.representative_id` references `travelers.traveler_id`; `travelers.family_id` references `families.family_id`; `travelers.guardian_id` references `travelers.traveler_id`; `qr_tokens.traveler_id` references `travelers.traveler_id`

---

### Requirement 27: Database Schema — Operations and Assignments

**User Story:** As a developer, I want a well-defined database schema for groups, assignments, events, and scan logs so that operational modules have structured, queryable data.

#### Acceptance Criteria

1. THE Backend_API database SHALL include a `groups` table with columns: `group_id` (UUID, PK), `name` (VARCHAR NOT NULL), `description` (TEXT nullable), `created_at` (TIMESTAMPTZ)
2. THE Backend_API database SHALL include a `traveler_groups` table with columns: `traveler_id` (UUID, FK), `group_id` (UUID, FK), PRIMARY KEY (`traveler_id`, `group_id`)
3. THE Backend_API database SHALL include an `events` table with columns: `event_id` (UUID, PK), `name` (VARCHAR NOT NULL), `event_type` (ENUM: bus, meal, activity, ceremony, transfer, hotel_checkin), `date` (DATE NOT NULL), `start_time` (TIMESTAMPTZ), `end_time` (TIMESTAMPTZ nullable), `location` (VARCHAR), `description` (TEXT nullable), `created_at` (TIMESTAMPTZ)
4. THE Backend_API database SHALL include an `event_eligibility` table with columns: `event_id` (UUID, FK), `group_id` (UUID, FK nullable), `hotel_id` (UUID, FK nullable), `option_id` (UUID, FK nullable), PRIMARY KEY (`event_id`, COALESCE(`group_id`, `hotel_id`, `option_id`))
5. THE Backend_API database SHALL include a `bus_assignments` table with columns: `assignment_id` (UUID, PK), `traveler_id` (UUID, FK, indexed), `bus_id` (UUID, FK), `event_id` (UUID, FK), `assigned_at` (TIMESTAMPTZ)
6. THE Backend_API database SHALL include a `hotels` table with columns: `hotel_id` (UUID, PK), `name` (VARCHAR NOT NULL), `address_en` (VARCHAR), `address_cn` (VARCHAR), `created_at` (TIMESTAMPTZ)
7. THE Backend_API database SHALL include a `traveler_hotels` table with columns: `traveler_id` (UUID, FK), `hotel_id` (UUID, FK), PRIMARY KEY (`traveler_id`, `hotel_id`)
8. THE Backend_API database SHALL include a `scan_logs` table with columns: `log_id` (UUID, PK), `staff_id` (UUID, FK NOT NULL, indexed), `qr_token_value` (VARCHAR NOT NULL, indexed), `scan_mode` (VARCHAR NOT NULL), `result` (ENUM: pass, fail, wrong_assignment, override), `override_reason` (VARCHAR nullable), `device_id` (VARCHAR), `scanned_at` (TIMESTAMPTZ NOT NULL, indexed), `synced_at` (TIMESTAMPTZ nullable)
9. THE Backend_API database SHALL include an `audit_logs` table with columns: `audit_id` (UUID, PK), `actor_id` (UUID, FK NOT NULL), `actor_role` (VARCHAR NOT NULL), `action_type` (VARCHAR NOT NULL, indexed), `entity_type` (VARCHAR NOT NULL), `entity_id` (UUID), `details` (JSONB), `created_at` (TIMESTAMPTZ NOT NULL, indexed)

---

### Requirement 28: Database Schema — Notifications and Dispatch

**User Story:** As a developer, I want database tables for notifications, dispatch, and itinerary options so that the notification system and dispatch engine have persistent storage.

#### Acceptance Criteria

1. THE Backend_API database SHALL include a `notifications` table with columns: `notification_id` (UUID, PK), `title` (VARCHAR NOT NULL), `body` (TEXT NOT NULL), `target_type` (ENUM: all, group, hotel, bus, individual), `target_id` (UUID nullable), `published_at` (TIMESTAMPTZ), `created_by` (UUID, FK)
2. THE Backend_API database SHALL include a `traveler_notifications` table with columns: `traveler_id` (UUID, FK), `notification_id` (UUID, FK), `read_at` (TIMESTAMPTZ nullable), PRIMARY KEY (`traveler_id`, `notification_id`)
3. THE Backend_API database SHALL include an `itinerary_options` table with columns: `option_id` (UUID, PK), `name` (VARCHAR NOT NULL), `description` (TEXT nullable), `created_at` (TIMESTAMPTZ)
4. THE Backend_API database SHALL include a `traveler_options` table with columns: `traveler_id` (UUID, FK), `option_id` (UUID, FK), PRIMARY KEY (`traveler_id`, `option_id`)
5. THE Backend_API database SHALL include a `buses` table with columns: `bus_id` (UUID, PK), `bus_number` (VARCHAR NOT NULL, unique), `capacity` (INTEGER NOT NULL), `event_id` (UUID, FK nullable), `departure_time` (TIMESTAMPTZ nullable), `terminal` (VARCHAR nullable), `created_at` (TIMESTAMPTZ)
6. THE Backend_API database SHALL include a `flights` table with columns: `flight_id` (UUID, PK), `flight_number` (VARCHAR NOT NULL), `arrival_time` (TIMESTAMPTZ NOT NULL), `terminal` (VARCHAR), `created_at` (TIMESTAMPTZ)
7. THE Backend_API database SHALL include a `traveler_flights` table with columns: `traveler_id` (UUID, FK), `flight_id` (UUID, FK), PRIMARY KEY (`traveler_id`, `flight_id`)



---

### Requirement 29: API Endpoints — Authentication

**User Story:** As a developer, I want well-defined API endpoints for authentication flows so that the client can implement magic link, booking lookup, and session management.

#### Acceptance Criteria

1. THE Backend_API SHALL expose `POST /api/v1/auth/magic-link` accepting `{ email: string }` and returning `{ success: boolean }` with status 200 regardless of email existence
2. THE Backend_API SHALL expose `GET /api/v1/auth/magic-link/verify?token={token}` returning `{ session_token: string, traveler_id: string, role_type: string }` on success or `{ error: "expired" | "used" | "invalid" }` on failure
3. THE Backend_API SHALL expose `POST /api/v1/auth/booking-lookup` accepting `{ booking_id: string, last_name: string }` and returning `{ session_token: string, traveler_id: string }` on success or `{ error: "invalid_credentials" }` on failure
4. THE Backend_API SHALL expose `POST /api/v1/auth/refresh` accepting a valid session token in the Authorization header and returning a new `{ session_token: string, expires_at: string }`
5. THE Backend_API SHALL expose `POST /api/v1/auth/logout` accepting a valid session token and invalidating it

---

### Requirement 30: API Endpoints — Traveler Data

**User Story:** As a developer, I want API endpoints for retrieving traveler profiles, QR tokens, family data, and itineraries so that the client can render personalized views.

#### Acceptance Criteria

1. THE Backend_API SHALL expose `GET /api/v1/travelers/me` returning the authenticated Traveler's profile: `{ traveler_id, full_name, email, role_type, access_status, family_id, group_ids, hotel, qr_token }`
2. THE Backend_API SHALL expose `GET /api/v1/travelers/me/qr` returning `{ qr_token_value: string, traveler_name: string }`
3. THE Backend_API SHALL expose `GET /api/v1/travelers/me/family` returning `{ family_id, members: [{ traveler_id, full_name, role_type, qr_token_value }] }` for Family_Representatives, or 403 for non-representatives
4. THE Backend_API SHALL expose `GET /api/v1/travelers/me/itinerary` returning `{ events: [{ event_id, name, event_type, date, start_time, end_time, location, description }] }` filtered by the Traveler's group, option, hotel, and role assignments
5. THE Backend_API SHALL expose `GET /api/v1/travelers/me/notifications` returning `{ notifications: [{ notification_id, title, body, published_at, read_at }] }` ordered by published_at descending
6. THE Backend_API SHALL expose `PATCH /api/v1/travelers/me/notifications/{notification_id}/read` marking a notification as read

---

### Requirement 31: API Endpoints — Staff Operations

**User Story:** As a developer, I want API endpoints for staff scanning, manifest download, and rescue console operations so that staff devices can operate efficiently.

#### Acceptance Criteria

1. THE Backend_API SHALL expose `GET /api/v1/staff/manifest?mode={scan_mode}` returning the full or delta Manifest as `{ travelers: [{ qr_token_value, traveler_id, full_name, family_id, role_type, eligibility: string[] }], version: string }`
2. THE Backend_API SHALL expose `GET /api/v1/staff/manifest/delta?since_version={version}` returning only records changed since the specified version
3. THE Backend_API SHALL expose `POST /api/v1/staff/scans/batch` accepting `{ scans: [{ qr_token_value, scan_mode, result, override_reason?, device_id, scanned_at }] }` for bulk upload of queued scan logs
4. THE Backend_API SHALL expose `GET /api/v1/staff/scan-modes` returning `{ modes: [{ mode_id, name, event_id, event_type }] }` for the current operational day
5. THE Backend_API SHALL expose `GET /api/v1/staff/rescue/search?q={query}&type={name|email}` returning `{ candidates: [{ traveler_id, full_name, email, booking_id, family_id, access_status, match_score }] }` ranked by relevance
6. THE Backend_API SHALL expose `POST /api/v1/staff/rescue/resend-magic-link` accepting `{ traveler_id: string }` and triggering a new Magic_Link email
7. THE Backend_API SHALL expose `GET /api/v1/staff/rescue/traveler/{traveler_id}` returning the full Traveler profile including QR_Token for staff display

---

### Requirement 32: API Endpoints — Admin Operations

**User Story:** As a developer, I want API endpoints for admin CRUD operations, CSV import, dispatch, and notifications so that the Admin_Console can manage all operational data.

#### Acceptance Criteria

1. THE Backend_API SHALL expose `POST /api/v1/admin/import/travelers` accepting a multipart CSV file upload and returning `{ imported: number, errors: [{ row: number, field: string, reason: string }] }`
2. THE Backend_API SHALL expose CRUD endpoints for travelers: `GET /api/v1/admin/travelers`, `GET /api/v1/admin/travelers/{id}`, `POST /api/v1/admin/travelers`, `PATCH /api/v1/admin/travelers/{id}`, `DELETE /api/v1/admin/travelers/{id}`
3. THE Backend_API SHALL expose CRUD endpoints for groups: `GET /api/v1/admin/groups`, `POST /api/v1/admin/groups`, `PATCH /api/v1/admin/groups/{id}`, `DELETE /api/v1/admin/groups/{id}`
4. THE Backend_API SHALL expose assignment endpoints: `POST /api/v1/admin/travelers/{id}/assign-group`, `POST /api/v1/admin/travelers/{id}/assign-hotel`, `POST /api/v1/admin/travelers/{id}/assign-bus`
5. THE Backend_API SHALL expose `POST /api/v1/admin/dispatch/auto` triggering the Dispatch_Engine and returning `{ proposed_assignments: [{ traveler_id, bus_id, bus_number }] }`
6. THE Backend_API SHALL expose `POST /api/v1/admin/dispatch/commit` accepting `{ assignments: [{ traveler_id, bus_id }] }` and committing the dispatch
7. THE Backend_API SHALL expose `POST /api/v1/admin/notifications` accepting `{ title, body, target_type, target_id? }` and publishing a notification
8. THE Backend_API SHALL expose `POST /api/v1/admin/qr/reissue` accepting `{ traveler_id: string }` and returning `{ new_qr_token_value: string }`
9. THE Backend_API SHALL expose `GET /api/v1/admin/audit-logs?start_date={}&end_date={}&action_type={}&actor_id={}&traveler_id={}` returning paginated audit log entries
10. THE Backend_API SHALL expose CRUD endpoints for events: `GET /api/v1/admin/events`, `POST /api/v1/admin/events`, `PATCH /api/v1/admin/events/{id}`, `DELETE /api/v1/admin/events/{id}`
11. THE Backend_API SHALL expose CRUD endpoints for buses: `GET /api/v1/admin/buses`, `POST /api/v1/admin/buses`, `PATCH /api/v1/admin/buses/{id}`
12. THE Backend_API SHALL expose `POST /api/v1/admin/import/flights` accepting a multipart CSV file upload for flight data import



---

### Requirement 33: Screen Wireframe — Traveler Home Screen

**User Story:** As a designer, I want a defined layout for the Traveler home screen so that the implementation matches the intended user experience.

#### Acceptance Criteria

1. THE Companion_App home screen SHALL display a top section with the Traveler's first name and a greeting message
2. THE Companion_App home screen SHALL display a prominent "My QR" card that navigates to the full QR display screen when tapped
3. THE Companion_App home screen SHALL display a "My Itinerary" card showing the next upcoming event with time and location
4. THE Companion_App home screen SHALL display a "Notifications" card with unread count badge
5. WHEN the Traveler is a Family_Representative, THE Companion_App home screen SHALL display a "Family Wallet" card showing the count of linked members
6. THE Companion_App home screen SHALL display a bottom navigation bar with tabs: Home, QR, Itinerary, Toolkit, and Notifications

---

### Requirement 34: Screen Wireframe — QR Display Screen

**User Story:** As a designer, I want a defined layout for the QR display screen so that QR codes are optimally scannable.

#### Acceptance Criteria

1. THE QR display screen SHALL show the QR code centered on screen at a minimum of 250x250 pixels
2. THE QR display screen SHALL display the Traveler's full name in large text below the QR code
3. THE QR display screen SHALL display the Traveler's role_type and group name below the name
4. THE QR display screen SHALL have a white or light background for maximum QR contrast
5. WHILE the QR display screen is active, THE Companion_App SHALL set screen brightness to maximum and disable screen auto-lock

---

### Requirement 35: Screen Wireframe — Family Wallet Screen

**User Story:** As a designer, I want a defined layout for the Family Wallet screen so that representatives can efficiently manage and display family member QR codes.

#### Acceptance Criteria

1. THE Family Wallet screen SHALL display a scrollable list of linked family members with name, role_type, and a thumbnail avatar or initial
2. WHEN a family member is tapped, THE Companion_App SHALL navigate to a full-screen QR display for that member
3. THE Family Wallet screen SHALL provide a "Slideshow" mode button that auto-cycles through member QR codes every 5 seconds
4. THE Family Wallet screen SHALL display the current member index (e.g., "2 of 4") during slideshow mode
5. THE Family Wallet screen SHALL provide swipe-left and swipe-right gestures to manually navigate between member QR codes

---

### Requirement 36: Screen Wireframe — Itinerary Screen

**User Story:** As a designer, I want a defined layout for the Itinerary screen so that travelers can easily find their schedule.

#### Acceptance Criteria

1. THE Itinerary screen SHALL display events in a vertical timeline grouped by date
2. THE Itinerary screen SHALL highlight the current or next upcoming event with a distinct visual indicator
3. EACH event card SHALL display: event name, time range, location, event type icon, and a brief description
4. THE Itinerary screen SHALL support pull-to-refresh to fetch the latest schedule when online
5. WHILE offline, THE Itinerary screen SHALL display a banner: "Offline — showing last synced schedule" with the sync timestamp

---

### Requirement 37: Screen Wireframe — Staff Scanner Screen

**User Story:** As a designer, I want a defined layout for the Staff Scanner screen so that staff can scan QR codes efficiently with clear visual feedback.

#### Acceptance Criteria

1. THE Staff Scanner screen SHALL display the active Scan_Mode in a prominent header bar with the mode name and event details
2. THE Staff Scanner screen SHALL display a camera viewfinder occupying the center 60% of the screen
3. WHEN a scan succeeds (eligible), THE Staff Scanner screen SHALL display a full-screen green overlay with the Traveler's name, a checkmark icon, and a confirmation sound
4. WHEN a scan fails (ineligible), THE Staff Scanner screen SHALL display a full-screen red overlay with "WRONG ASSIGNMENT", the correct assignment, and an alert sound
5. THE Staff Scanner screen SHALL display a scan counter showing total scans and pass/fail counts for the current session
6. THE Staff Scanner screen SHALL provide a "Batch Family" toggle that enables batch family check-in mode
7. THE Staff Scanner screen SHALL provide a "Change Mode" button to switch Scan_Mode without leaving the scanner

---

### Requirement 38: Screen Wireframe — Staff Rescue Console Screen

**User Story:** As a designer, I want a defined layout for the Staff Rescue Console so that desk staff can quickly search, identify, and assist travelers.

#### Acceptance Criteria

1. THE Rescue Console screen SHALL display a search bar at the top with toggle buttons for "Name" and "Email" search modes
2. THE Rescue Console screen SHALL display search results as a scrollable list of candidate cards showing: full name, email (masked), booking_id, and match score
3. WHEN a candidate is selected, THE Rescue Console screen SHALL expand to show: full profile, family members, group assignments, access_status, and action buttons
4. THE Rescue Console screen SHALL provide action buttons: "Show QR" (full-screen QR display), "Resend Magic Link", and "View Itinerary"
5. THE Rescue Console screen SHALL display a confirmation dialog before executing any recovery action

---

### Requirement 39: Screen Wireframe — Admin Dashboard Screen

**User Story:** As a designer, I want a defined layout for the Admin Dashboard so that operations managers have a clear overview of event status.

#### Acceptance Criteria

1. THE Admin Dashboard SHALL display summary cards: total travelers, activated travelers, pending activations, families, and staff users
2. THE Admin Dashboard SHALL display a real-time scan activity feed showing the last 20 scan events
3. THE Admin Dashboard SHALL display bus fill status as a visual bar chart showing capacity vs. assigned per bus
4. THE Admin Dashboard SHALL provide navigation to: Traveler Management, Group Management, Event Management, Bus Dispatch, Notifications, and Audit Logs
5. THE Admin Dashboard SHALL display system health indicators: manifest sync status, notification delivery rate, and scan sync backlog count

---

### Requirement 40: Screen Wireframe — Toolkit Screens

**User Story:** As a designer, I want defined layouts for the Destination Toolkit screens so that travelers can access practical travel tools.

#### Acceptance Criteria

1. THE Toolkit hub screen SHALL display cards for: Taxi Card, Phrasebook, Currency Converter, and Emergency Info
2. THE Taxi Card screen SHALL display the hotel name and address in large bilingual text (English and Simplified Chinese) on a clean white background optimized for showing to drivers
3. THE Phrasebook screen SHALL display categorized phrases in a collapsible accordion layout with English, Chinese characters, and Pinyin for each phrase, plus a speaker icon for TTS playback
4. THE Currency Converter screen SHALL display two input fields (CNY and USD) with real-time conversion and the exchange rate date
5. THE Emergency Info screen SHALL display local emergency numbers, embassy contact, event operations hotline, and hospital information



---

## Non-Functional Requirements

---

### Requirement 41: Performance

**User Story:** As a platform operator, I want the system to meet defined performance targets so that the user experience is fast and reliable at scale.

#### Acceptance Criteria

1. THE Backend_API SHALL respond to authenticated API requests within 200 milliseconds at the 95th percentile under a load of 500 concurrent users
2. THE Companion_App SHALL achieve a Lighthouse Performance score of 85 or above on mobile
3. THE Companion_App SHALL render the QR display screen within 1 second of navigation, including from cold cache
4. THE Backend_API SHALL support 100 concurrent manifest delta sync requests without degradation
5. THE Fuzzy_Search SHALL return results within 500 milliseconds for a database of 5,000 traveler records
6. THE Companion_App initial bundle size SHALL not exceed 500 KB gzipped for the critical rendering path

---

### Requirement 42: Security

**User Story:** As a platform operator, I want the system to follow security best practices so that traveler data is protected.

#### Acceptance Criteria

1. THE Backend_API SHALL serve all endpoints over HTTPS with TLS 1.2 or higher
2. THE Backend_API SHALL authenticate all non-public endpoints using signed session tokens (JWT) with a maximum lifetime of 24 hours
3. THE Backend_API SHALL hash QR_Token values using SHA-256 before storing in the database (the raw token is only in the `token_value` field for lookup; a `token_hash` column stores the hash for audit)
4. THE Backend_API SHALL sanitize all user inputs to prevent SQL injection and XSS attacks
5. THE Backend_API SHALL implement role-based access control: Traveler endpoints accessible only to traveler/representative roles; Staff endpoints accessible only to staff roles; Admin endpoints accessible only to admin/super_admin roles
6. THE Backend_API SHALL encrypt sensitive fields (email_primary, phone) at rest using AES-256
7. THE Companion_App SHALL not store session tokens in localStorage; tokens SHALL be stored in httpOnly secure cookies or in-memory only

---

### Requirement 43: Scalability

**User Story:** As a platform operator, I want the system to handle the full event scale so that it works reliably for 3,000+ travelers and 50+ staff simultaneously.

#### Acceptance Criteria

1. THE Backend_API SHALL support 3,500 registered traveler records without performance degradation
2. THE Backend_API SHALL support 50 concurrent staff scanner connections performing manifest sync and scan uploads
3. THE Backend_API SHALL support 500 concurrent traveler sessions accessing QR, itinerary, and notification endpoints
4. THE Backend_API database SHALL use connection pooling with a minimum of 20 and maximum of 100 connections
5. THE Backend_API SHALL support horizontal scaling behind a load balancer for the API tier

---

### Requirement 44: Accessibility

**User Story:** As a Traveler with accessibility needs, I want the platform to be usable with assistive technologies so that I can access my QR code and itinerary independently.

#### Acceptance Criteria

1. THE Companion_App SHALL meet WCAG 2.1 Level AA compliance for all traveler-facing screens
2. THE Companion_App SHALL support screen reader navigation with proper ARIA labels on all interactive elements
3. THE Companion_App SHALL maintain a minimum color contrast ratio of 4.5:1 for all text
4. THE Companion_App SHALL support text scaling up to 200% without layout breakage
5. THE Companion_App SHALL ensure all interactive elements have a minimum touch target size of 44x44 pixels

---

### Requirement 45: Internationalization

**User Story:** As a platform operator, I want the system to support English as the primary language with Chinese content for the toolkit so that the platform serves an international audience visiting China.

#### Acceptance Criteria

1. THE Companion_App SHALL render all UI chrome, labels, and navigation in English as the default language
2. THE Companion_App SHALL render taxi card content in both English and Simplified Chinese
3. THE Companion_App SHALL render phrasebook entries in English, Simplified Chinese, and Pinyin
4. THE Backend_API SHALL store and serve all text content in UTF-8 encoding
5. THE Companion_App SHALL support right-to-left text rendering for future locale expansion without architectural changes

---

## Correctness Properties for Property-Based Testing

---

### Requirement 46: Round-Trip Properties

**User Story:** As a developer, I want round-trip correctness properties defined so that serialization, parsing, and data transformation logic can be verified with property-based tests.

#### Acceptance Criteria

1. FOR ALL valid Traveler records, serializing to JSON and deserializing back SHALL produce an equivalent Traveler object (round-trip property)
2. FOR ALL valid QR_Token values, encoding to QR image data and decoding back SHALL produce the original token string (round-trip property)
3. FOR ALL valid Manifest objects, serializing for IndexedDB storage and deserializing back SHALL produce an equivalent Manifest object (round-trip property)
4. FOR ALL valid itinerary event lists, filtering by group/option/hotel and then merging back with unfiltered events SHALL preserve the original event set (idempotent filter property)
5. FOR ALL valid CSV import rows, parsing to Traveler objects and formatting back to CSV SHALL produce rows equivalent to the original input (round-trip property for CSV parser/printer)

---

### Requirement 47: Invariant Properties

**User Story:** As a developer, I want invariant correctness properties defined so that data integrity rules can be verified with property-based tests.

#### Acceptance Criteria

1. FOR ALL Family_IDs, the count of members with role_type "representative" SHALL be exactly 1 (family representative invariant)
2. FOR ALL Minor_Dependents, the guardian_id SHALL reference a valid Traveler with role_type "traveler" or "representative" (guardian validity invariant)
3. FOR ALL active QR_Tokens, there SHALL be exactly one active token per traveler_id (token uniqueness invariant)
4. FOR ALL bus assignments produced by the Dispatch_Engine, all members of a Family_ID SHALL be assigned to the same bus_id (family preservation invariant)
5. FOR ALL bus assignments, the count of assigned travelers SHALL not exceed the bus capacity (capacity invariant)
6. FOR ALL Normalized_Names, the normalization function applied twice SHALL produce the same result as applied once (normalization idempotence)

---

### Requirement 48: Metamorphic and Error Properties

**User Story:** As a developer, I want metamorphic and error-condition correctness properties defined so that search, dispatch, and validation logic can be verified with property-based tests.

#### Acceptance Criteria

1. FOR ALL Fuzzy_Search queries, adding more characters to a query SHALL return a result set that is a subset of or equal to the result set of the shorter query (monotonic refinement property)
2. FOR ALL Fuzzy_Search queries, searching for a Traveler's exact full_name_normalized SHALL always include that Traveler in the results (recall property)
3. FOR ALL Dispatch_Engine inputs, adding one more Traveler to the input SHALL not decrease the total number of buses used (monotonic bus count property)
4. FOR ALL invalid QR_Token strings (random strings not in the Manifest), local validation SHALL return a rejection result within 300 milliseconds (error condition property)
5. FOR ALL scan events with result "override", the override_reason field SHALL be non-null and non-empty (override completeness invariant)
6. FOR ALL Magic_Link tokens, using the same token twice SHALL result in the second attempt being rejected (single-use property)
