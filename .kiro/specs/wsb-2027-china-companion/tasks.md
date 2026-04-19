# Implementation Plan: WSB 2027 China Digital Companion

## Overview

This plan implements the WSB 2027 China Digital Companion — a PWA-first tour operations platform for 3,000+ international travelers. The implementation follows a bottom-up approach: database schema and shared types first, then backend services, then client-side PWA screens, and finally integration wiring. TypeScript is used throughout (Node.js backend, React + Vite frontend).

## Tasks

- [x] 1. Project scaffolding and database schema
  - [x] 1.1 Initialize monorepo with backend (Node.js/Express/TypeScript) and frontend (React/Vite/TypeScript) packages
    - Set up `package.json`, `tsconfig.json`, shared types package
    - Configure Vitest for testing, ESLint, Prettier
    - Install core dependencies: express, pg, redis, idb, zustand, workbox, fast-check
    - _Requirements: 23.1, 23.5, 26.1_

  - [x] 1.2 Create PostgreSQL database schema migrations
    - Implement all DDL from the design: extensions (uuid-ossp, pg_trgm, pgcrypto), enums, and all tables (families, travelers, qr_tokens, magic_links, groups, traveler_groups, hotels, traveler_hotels, events, event_eligibility, itinerary_options, traveler_options, buses, bus_assignments, flights, traveler_flights, notifications, traveler_notifications, scan_logs, audit_logs)
    - Create all indexes including trigram index on full_name_normalized
    - Enforce all foreign key constraints and referential integrity
    - _Requirements: 26.1, 26.2, 26.3, 26.4, 26.5, 27.1, 27.2, 27.3, 27.4, 27.5, 27.6, 27.7, 27.8, 27.9, 28.1, 28.2, 28.3, 28.4, 28.5, 28.6, 28.7_

  - [x] 1.3 Define shared TypeScript types and interfaces
    - Create type definitions for all enums (RoleType, AccessStatus, EventType, ScanResult, NotificationTarget)
    - Create interfaces for all API request/response shapes from the design
    - Create interfaces for IndexedDB schema (CompanionDB)
    - _Requirements: 26.1, 29.1, 30.1_

- [x] 2. Backend core: middleware, auth service, and name normalization
  - [x] 2.1 Implement middleware stack
    - Build CORS, Helmet security headers, request logging middleware
    - Implement Redis-backed rate limiting middleware (sliding window)
    - Implement JWT auth middleware (verify session token, extract traveler_id and role)
    - Implement RBAC middleware enforcing the role-endpoint matrix from the design
    - Implement audit middleware that logs all mutation requests
    - _Requirements: 42.1, 42.2, 42.4, 42.5, 42.7, 21.3, 43.4_

  - [x] 2.2 Implement name normalization utility
    - Implement `normalizeName()`: trim → lowercase → NFD decompose → strip combining marks → collapse whitespace
    - _Requirements: 2.3, 17.6_

  - [x] 2.3 Write property test for name normalization idempotence
    - **Property 5: Name normalization idempotence**
    - **Validates: Requirements 2.3, 47.6**

  - [x] 2.4 Implement Auth Service — magic link flow
    - `POST /api/v1/auth/magic-link`: generate single-use token (crypto.randomBytes), store in magic_links table with 24h expiry, send email, always return `{ success: true }`
    - `GET /api/v1/auth/magic-link/verify?token=`: validate token, check expiry, check used_at, mark as used, create JWT session, return session_token
    - Rate limiting: 5 requests per email per hour via Redis sliding window
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 29.1, 29.2_

  - [x] 2.5 Implement Auth Service — booking lookup and session management
    - `POST /api/v1/auth/booking-lookup`: normalize last_name, match against booking_id + normalized name, return generic error on mismatch, lock after 5 failures per IP for 30 min
    - `POST /api/v1/auth/refresh`: verify existing token, issue new JWT
    - `POST /api/v1/auth/logout`: invalidate session
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 29.3, 29.4, 29.5_

  - [x] 2.6 Write property tests for auth service
    - **Property 6: Magic link single-use enforcement**
    - **Validates: Requirements 1.4, 48.6**
    - **Property 7: Magic link expiry enforcement**
    - **Validates: Requirements 1.3**
    - **Property 8: Auth response uniformity**
    - **Validates: Requirements 1.5, 2.2**
    - **Property 9: Rate limiting enforcement**
    - **Validates: Requirements 1.6**

- [x] 3. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Backend: traveler service, family management, and QR tokens
  - [x] 4.1 Implement Traveler Service — profile and QR endpoints
    - `GET /api/v1/travelers/me`: return authenticated traveler profile with group_ids, hotel, qr_token
    - `GET /api/v1/travelers/me/qr`: return qr_token_value and traveler_name
    - _Requirements: 5.1, 5.3, 30.1, 30.2_

  - [x] 4.2 Implement Traveler Service — family endpoints
    - `GET /api/v1/travelers/me/family`: return family_id and all linked members with QR tokens (403 for non-representatives)
    - Enforce family representative uniqueness (exactly one per family_id)
    - Enforce minor single-guardian invariant (one guardian_id per minor)
    - Enforce minor QR accessibility through guardian's family wallet
    - Handle representative change: revoke previous representative's access within 60 seconds
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 30.3_

  - [x] 4.3 Write property tests for family invariants
    - **Property 10: Family representative uniqueness invariant**
    - **Validates: Requirements 4.2, 47.1**
    - **Property 11: Minor single guardian invariant**
    - **Validates: Requirements 4.6, 47.2**
    - **Property 12: Minor QR accessible through guardian**
    - **Validates: Requirements 4.4**

  - [x] 4.4 Implement QR token reissuance
    - `POST /api/v1/admin/qr/reissue`: invalidate existing token (set is_active=false, revoked_at), generate new token, update manifest, log audit event
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 32.8_

  - [x] 4.5 Write property test for QR token reissuance
    - **Property 13: Active QR token uniqueness after reissuance**
    - **Validates: Requirements 22.1, 22.2, 22.5, 47.3**

- [x] 5. Backend: itinerary engine, notifications, and audit
  - [x] 5.1 Implement Itinerary Engine
    - `GET /api/v1/travelers/me/itinerary`: filter events by traveler's group_ids, option_ids, hotel_id using the eligibility matching algorithm from the design
    - Events with no eligibility rules are included for all travelers
    - _Requirements: 7.1, 7.2, 7.4, 30.4_

  - [x] 5.2 Write property tests for itinerary filtering
    - **Property 14: Itinerary filtering correctness**
    - **Validates: Requirements 7.1, 7.2**
    - **Property 15: Itinerary filter idempotence**
    - **Validates: Requirements 46.4**

  - [x] 5.3 Implement Notification Service
    - `POST /api/v1/admin/notifications`: create notification, resolve targets by target_type (all/group/hotel/bus/individual), insert into traveler_notifications
    - `GET /api/v1/travelers/me/notifications`: return notifications ordered by published_at desc
    - `PATCH /api/v1/travelers/me/notifications/{id}/read`: mark as read
    - SSE endpoint `GET /api/v1/notifications/stream`: push real-time notifications to connected travelers
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 30.5, 30.6, 32.7_

  - [x] 5.4 Implement Audit Service
    - Audit logging middleware for all mutations (actor_id, actor_role, action_type, entity_type, entity_id, details with before/after values)
    - `GET /api/v1/admin/audit-logs`: paginated, filterable by date range, action_type, actor_id, traveler_id
    - 12-month retention policy
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 32.9_

- [x] 6. Backend: scan service, manifest, and dispatch engine
  - [x] 6.1 Implement Scan Service — manifest endpoints
    - `GET /api/v1/staff/manifest?mode={scan_mode}`: generate full manifest with QR tokens, eligibility arrays, family data
    - `GET /api/v1/staff/manifest/delta?since_version={version}`: return only changed records since version
    - `GET /api/v1/staff/scan-modes`: return available scan modes for current operational day
    - _Requirements: 12.1, 25.1, 25.2, 25.5, 31.1, 31.2, 31.4_

  - [x] 6.2 Implement Scan Service — scan log ingestion
    - `POST /api/v1/staff/scans/batch`: accept array of scan log entries, validate, insert into scan_logs table
    - Log overrides with reason codes for admin review
    - _Requirements: 12.5, 12.6, 16.3, 16.4, 31.3_

  - [x] 6.3 Implement Fuzzy Search Engine for staff rescue
    - `GET /api/v1/staff/rescue/search?q={query}&type={name|email}`: use pg_trgm similarity() for name search, LIKE prefix + trgm fallback for email
    - Minimum query length: 2 chars (name), 3 chars (email), top 20 results ranked by score
    - `POST /api/v1/staff/rescue/resend-magic-link`: generate and send new magic link
    - `GET /api/v1/staff/rescue/traveler/{id}`: return full profile with QR token
    - Log all rescue actions with staff_id and timestamp
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7, 31.5, 31.6, 31.7_

  - [x] 6.4 Write property tests for fuzzy search
    - **Property 22: Fuzzy search exact recall**
    - **Validates: Requirements 3.1, 3.2, 48.2**
    - **Property 23: Fuzzy search monotonic refinement**
    - **Validates: Requirements 48.1**

  - [x] 6.5 Implement Dispatch Engine
    - `POST /api/v1/admin/dispatch/auto`: cluster travelers by terminal and 30-min arrival windows, bin-pack families into buses (target 85-100% capacity), preserve family grouping, return proposed assignments
    - `POST /api/v1/admin/dispatch/commit`: commit assignments, update manifest, push to itineraries
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 32.5, 32.6_

  - [x] 6.6 Write property tests for dispatch engine
    - **Property 19: Dispatch family preservation invariant**
    - **Validates: Requirements 19.3, 47.4**
    - **Property 20: Dispatch capacity invariant**
    - **Validates: Requirements 19.2, 47.5**
    - **Property 21: Dispatch monotonic bus count**
    - **Validates: Requirements 48.3**

- [x] 7. Backend: admin service (CRUD, CSV import)
  - [x] 7.1 Implement Admin Service — traveler CRUD and CSV import
    - CRUD endpoints for travelers: GET list, GET by id, POST create, PATCH update, DELETE deactivate
    - `POST /api/v1/admin/import/travelers`: streaming CSV parse (papaparse), row-level validation (required fields, email format, role_type enum, guardian_id for minors), generate normalized_name and QR token per row, bulk insert valid rows in transaction, return import summary with per-row errors
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 32.1, 32.2_

  - [x] 7.2 Write property test for CSV round-trip
    - **Property 4: CSV parse/format round-trip**
    - **Validates: Requirements 46.5, 17.1**

  - [x] 7.3 Implement Admin Service — groups, events, buses, hotels, flights CRUD
    - CRUD endpoints for groups, events, buses, hotels
    - Assignment endpoints: assign-group, assign-hotel, assign-bus
    - Flight CSV import
    - Update manifest and notify staff devices within 5 minutes on assignment changes
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 32.3, 32.4, 32.10, 32.11, 32.12_

  - [x] 7.4 Implement Admin Service — family linking
    - Endpoints to create families, link members, assign representative_id and guardian_id
    - Enforce minor must have valid guardian_id before activation
    - _Requirements: 4.1, 4.2, 4.6, 17.4, 17.5_

- [x] 8. Checkpoint — Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Frontend: PWA shell, service worker, and offline infrastructure
  - [x] 9.1 Set up React + Vite PWA shell
    - Configure Vite with PWA plugin (Workbox)
    - Create Web App Manifest (name, icons, theme color, display: standalone)
    - Register Service Worker for asset caching and offline fallback
    - Set up React Router with all routes from the design
    - Configure Zustand stores for client state
    - _Requirements: 23.1, 23.2, 23.4, 23.5, 23.6_

  - [x] 9.2 Implement IndexedDB layer and sync engine
    - Set up IndexedDB schema using `idb` wrapper (profile, qrToken, familyMembers, itinerary, notifications, taxiCard, phrasebook, exchangeRate, manifest, manifestMeta, scanQueue, syncMeta)
    - Implement sync engine: background sync on connectivity restore, server-wins conflict resolution, "last synced" timestamp tracking
    - Implement offline indicator detection and display
    - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.5_

  - [x] 9.3 Implement API client layer
    - Fetch wrapper with auth headers (JWT from httpOnly cookie or in-memory), retry logic (exponential backoff: 3 retries, 1s base, 10s max), offline queue for mutations
    - _Requirements: 42.7, 41.1_

- [x] 10. Frontend: authentication screens
  - [x] 10.1 Implement Login screen
    - Email input with magic link request
    - Booking lookup tab (booking_id + last name)
    - Handle magic link verification from URL parameter
    - Display expiration/already-used messages with resend option
    - PWA install prompt after first successful auth
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 23.3_

- [x] 11. Frontend: traveler screens (Home, QR, Family Wallet, Itinerary, Notifications)
  - [x] 11.1 Implement Home screen
    - Greeting with traveler's first name
    - "My QR" card linking to QR display
    - "My Itinerary" card showing next upcoming event
    - "Notifications" card with unread count badge
    - "Family Wallet" card (visible only for representatives) with linked member count
    - Bottom navigation bar: Home, QR, Itinerary, Toolkit, Notifications
    - _Requirements: 33.1, 33.2, 33.3, 33.4, 33.5, 33.6_

  - [x] 11.2 Implement QR Display screen
    - Render QR code at minimum 250x250px, high contrast, white background
    - Display traveler's full name, role_type, and group name below QR
    - Set screen brightness to maximum, disable screen auto-lock while active
    - Cache QR_Token in IndexedDB for offline display
    - Update cached token on next sync when reissued (within 30 seconds of connectivity)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 34.1, 34.2, 34.3, 34.4, 34.5_

  - [x] 11.3 Implement Family Wallet screen
    - Scrollable list of linked family members with name, role_type, and initial avatar
    - Tap member to show full-screen QR
    - Slideshow mode: auto-cycle QR codes every 5 seconds
    - Swipe left/right navigation between members
    - Position indicator ("2 of 4")
    - Cache all family member QR tokens in IndexedDB
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 35.1, 35.2, 35.3, 35.4, 35.5_

  - [x] 11.4 Implement Itinerary screen
    - Vertical timeline grouped by date
    - Highlight current/next upcoming event
    - Each event card: name, time range, location, event type icon, description
    - Pull-to-refresh when online
    - Offline banner with last synced timestamp
    - Cache itinerary in IndexedDB
    - _Requirements: 7.1, 7.3, 7.4, 7.5, 7.6, 36.1, 36.2, 36.3, 36.4, 36.5_

  - [x] 11.5 Implement Notifications screen
    - Notification list ordered by published_at desc
    - Unread badge count on navigation bar
    - Mark-as-read on tap
    - SSE connection for real-time push (display within 30 seconds)
    - Fetch missed notifications on app open after offline
    - Cache notifications in IndexedDB
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 12. Frontend: destination toolkit screens
  - [x] 12.1 Implement Toolkit hub screen
    - Cards for: Taxi Card, Phrasebook, Currency Converter, Emergency Info
    - _Requirements: 40.1_

  - [x] 12.2 Implement Taxi Card screen
    - Display hotel name and address in large bilingual text (English + Simplified Chinese)
    - Minimum 24pt font size, clean white background
    - Cache in IndexedDB, update on hotel assignment change
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 40.2_

  - [x] 12.3 Implement Phrasebook screen
    - Categorized accordion layout: Greetings, Directions, Food, Emergency, Shopping, Transportation
    - Each phrase: English, Chinese characters, Pinyin
    - Text-to-speech playback via Web Speech API
    - Cache all content in IndexedDB
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 40.3_

  - [x] 12.4 Implement Currency Converter screen
    - Two input fields: CNY and USD with real-time bidirectional conversion
    - Fetch and cache exchange rate daily
    - Display rate date; use cached rate when offline
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 40.4_

  - [x] 12.5 Write property test for currency conversion
    - **Property 24: Currency conversion round-trip**
    - **Validates: Requirements 11.1, 11.2**

  - [x] 12.6 Implement Emergency Info screen
    - Display local emergency numbers, embassy contact, event operations hotline, hospital information
    - Cache in IndexedDB
    - _Requirements: 40.5_

- [x] 13. Checkpoint — Ensure all traveler-facing tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Frontend: staff scanner screens
  - [x] 14.1 Implement manifest preload and sync UI
    - Manifest sync trigger with progress indicator and completion status
    - Store manifest as Map<string, ManifestEntry> in IndexedDB for O(1) lookup
    - Stale manifest warning (>4 hours) with re-sync prompt
    - Delta sync support (only changed records after initial full sync)
    - _Requirements: 25.1, 25.2, 25.3, 25.4, 25.5, 25.6_

  - [x] 14.2 Implement Staff Scanner screen — core scanning
    - Camera viewfinder (center 60% of screen)
    - Active Scan_Mode in prominent header bar
    - Local manifest validation (<300ms): lookup QR in Map, check eligibility for active scan mode
    - Green confirmation overlay (name, checkmark, confirmation sound) for eligible scans
    - Red rejection overlay ("WRONG ASSIGNMENT" + correct assignment, alert sound) for ineligible scans
    - Red "Unknown QR" overlay for tokens not in manifest
    - "Token Revoked — Contact Staff" message for invalidated tokens
    - Scan counter (total, pass, fail) for current session
    - "Change Mode" button to switch scan mode
    - Store each scan result in Sync_Queue (IndexedDB)
    - Upload queued scans to backend when connectivity restored (within 60 seconds)
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 13.1, 13.2, 13.3, 13.4, 13.5, 14.1, 14.2, 14.3, 14.4, 22.5, 37.1, 37.2, 37.3, 37.4, 37.5, 37.7_

  - [x] 14.3 Write property test for local scan validation
    - **Property 16: Local scan validation correctness**
    - **Validates: Requirements 12.2, 13.1, 14.1, 48.4**

  - [x] 14.4 Implement batch family check-in mode
    - "Batch Family" toggle on scanner screen
    - When scanning a Family_Representative's QR in batch mode: display all linked members with eligibility status
    - Confirm batch check-in: record check-in for each eligible member
    - Display count ("4 of 4 checked in")
    - Highlight ineligible members in red, exclude from batch
    - Override option for ineligible members with mandatory reason code
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 37.6_

  - [x] 14.5 Write property test for batch family check-in
    - **Property 17: Batch family check-in correctness**
    - **Validates: Requirements 15.1, 15.2, 15.3, 15.4**

  - [x] 14.6 Implement staff manual override flow
    - "Override" button on rejection/wrong-assignment screens
    - Reason code selection from predefined list: "Manager Approved", "Data Error", "VIP Exception", "Emergency"
    - Record override with reason code, staff_id, timestamp in Sync_Queue
    - _Requirements: 16.1, 16.2, 16.3, 16.4_

  - [x] 14.7 Write property test for override reason completeness
    - **Property 18: Override reason completeness invariant**
    - **Validates: Requirements 16.2, 16.3, 48.5**

- [x] 15. Frontend: staff rescue console screen
  - [x] 15.1 Implement Staff Rescue Console
    - Search bar with Name/Email toggle
    - Candidate list: full name, masked email, booking_id, match score
    - Expanded profile view: full name, email, Booking_ID, Family_ID, group assignments, access_status, action buttons
    - "Show QR" action: full-screen scannable QR display on staff device
    - "Resend Magic Link" action with confirmation dialog
    - "View Itinerary" action
    - _Requirements: 3.4, 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7, 38.1, 38.2, 38.3, 38.4, 38.5_

- [x] 16. Frontend: admin console screens
  - [x] 16.1 Implement Admin Dashboard
    - Summary cards: total travelers, activated, pending, families, staff
    - Real-time scan activity feed (last 20 events)
    - Bus fill status bar chart (capacity vs. assigned)
    - Navigation to all admin sub-screens
    - System health indicators: manifest sync status, notification delivery rate, scan sync backlog
    - _Requirements: 39.1, 39.2, 39.3, 39.4, 39.5_

  - [x] 16.2 Implement Admin Traveler Management screen
    - CRUD table for travelers with search and filter
    - CSV import UI with progress, error report display (row number, field, reason)
    - Family linking UI: create family, add members, assign representative/guardian
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6_

  - [x] 16.3 Implement Admin Group and Assignment Management screen
    - CRUD for groups
    - Assign travelers to groups, itinerary options, hotels, bus assignments
    - Summary view: assignment counts per group, hotel, bus
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

  - [x] 16.4 Implement Admin Event Management screen
    - CRUD for events with eligibility rule configuration (group, hotel, option)
    - _Requirements: 32.10_

  - [x] 16.5 Implement Admin Bus Dispatch screen
    - Auto-dispatch trigger button
    - Proposed assignments review table (traveler, bus, terminal, arrival time)
    - Commit button to finalize assignments
    - _Requirements: 19.5, 19.6_

  - [x] 16.6 Implement Admin Notifications screen
    - Compose form: title, body, target_type selector (all/group/hotel/bus/individual), target_id
    - Publish button
    - _Requirements: 32.7_

  - [x] 16.7 Implement Admin Audit Log screen
    - Searchable, filterable log viewer: date range, action_type, staff_id, traveler_id
    - Paginated results
    - _Requirements: 21.4_

- [x] 17. Checkpoint — Ensure all frontend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 18. Serialization round-trip property tests
  - [x] 18.1 Write property test for traveler serialization round-trip
    - **Property 1: Traveler serialization round-trip**
    - **Validates: Requirements 46.1**

  - [x] 18.2 Write property test for QR encoding round-trip
    - **Property 2: QR encoding round-trip**
    - **Validates: Requirements 46.2**

  - [x] 18.3 Write property test for manifest serialization round-trip
    - **Property 3: Manifest serialization round-trip**
    - **Validates: Requirements 46.3**

- [x] 19. Accessibility, performance, and security hardening
  - [x] 19.1 Implement accessibility compliance
    - Add ARIA labels to all interactive elements across all screens
    - Ensure minimum 4.5:1 color contrast ratio for all text
    - Ensure 44x44px minimum touch targets
    - Support text scaling up to 200% without layout breakage
    - Screen reader navigation support
    - _Requirements: 44.1, 44.2, 44.3, 44.4, 44.5_

  - [x] 19.2 Implement internationalization support
    - All UI chrome in English as default
    - UTF-8 encoding for all text content
    - RTL-ready layout structure for future locale expansion
    - _Requirements: 45.1, 45.4, 45.5_

  - [x] 19.3 Implement security hardening
    - HTTPS enforcement (TLS 1.2+)
    - Input sanitization on all endpoints (SQL injection, XSS prevention)
    - Session token storage: httpOnly secure cookies or in-memory only (not localStorage)
    - AES-256 encryption at rest for email_primary and phone fields
    - SHA-256 hashing of QR token values for audit (token_hash column)
    - _Requirements: 42.1, 42.3, 42.4, 42.6, 42.7_

  - [x] 19.4 Optimize performance
    - Critical rendering path bundle size ≤ 500 KB gzipped
    - Connection pooling: min 20, max 100 database connections
    - QR display render within 1 second from navigation
    - _Requirements: 41.2, 41.3, 41.6, 43.4_

- [x] 20. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate the 24 correctness properties defined in the design using fast-check
- Unit tests validate specific examples and edge cases using Vitest
- TypeScript is used throughout (Node.js backend + React frontend) as specified in the design
