# WSB 2027 China Digital Companion — Project Review Report
**Date:** April 2026 | **Reviewer:** Automated Code Audit

---

## Executive Summary

The app is **functional for demo purposes** but has **23 issues** that need fixing before a 3,000-traveler live event. Of these, **5 are critical** (will break during operation), **8 are high priority** (will cause problems under load), and **10 are medium** (should fix but won't block operations).

---

## 🔴 CRITICAL — Will Break During Operation (Fix Before Event)

### 1. QR Scanner Race Condition
**Problem:** When staff opens the scanner, the QR token database takes 2-5 seconds to load. If they scan a QR code during this window, it shows "Not Found" even for valid travelers.
**Impact:** First few scans at every check-in point will fail. Staff will think the system is broken.
**Fix:** Block scanning until QR database is loaded. Show a loading indicator.

### 2. Scan Check-ins Are Not Saved to Database
**Problem:** When staff scans a QR code and checks someone in, the result is stored only in the browser's memory (`scannedRef`). If the staff refreshes the page or switches phones, all scan history is lost. The `checkin_status` in the database is never updated.
**Impact:** Check-in data is lost on page refresh. No permanent record of who was scanned. Multiple staff scanning the same person won't know about each other's scans.
**Fix:** POST each scan result to the backend. Update `checkin_status` and `event_attendance.attended` in the database.

### 3. Flight & Hotel Add/Edit Buttons Don't Work
**Problem:** The "Add Flight", "Edit Flight", "Add Hotel", "Edit Hotel" buttons in the ops panel call API endpoints (`/api/v1/admin/flights`, `/api/v1/admin/hotels`) that don't exist for POST/PATCH operations on flights.
**Impact:** Super Admins click buttons, get errors, can't manage flight data.
**Fix:** Implement the missing backend endpoints.

### 4. Rate Limiting Disabled
**Problem:** The booking lookup login has no rate limiting (Redis not connected). An attacker can brute-force booking IDs.
**Impact:** Security risk — unauthorized access to traveler accounts.
**Fix:** Either connect Redis or implement in-memory rate limiting.

### 5. Magic Link Email Not Working
**Problem:** The "Email Sign In" tab on the traveler login page doesn't work because no email service is configured.
**Impact:** Travelers who try email sign-in get an error. Confusing UX.
**Fix:** Either configure an email service (SendGrid) or remove the tab and only show "Find My Booking".

---

## 🟡 HIGH — Will Cause Problems Under Load (Fix Before Event)

### 6. Master List Query Slow at Scale
**Problem:** The master list query joins 9 tables using CTEs. For 3,000 travelers, this query could take 5-10 seconds.
**Impact:** Ops panel loads slowly. Staff waiting at check-in points.
**Fix:** Add database indexes, consider materialized views, or paginate more aggressively.

### 7. QR Map Loads All 3,000 Tokens at Once
**Problem:** The scanner fetches ALL QR tokens on startup (`GET /api/v1/admin/qr-map`). For 3,000 travelers, this is a large payload.
**Impact:** Scanner takes 5+ seconds to become ready. Uses significant mobile data.
**Fix:** Cache the QR map locally, use delta sync for updates.

### 8. Offline QR Code Shows Revoked Token
**Problem:** If an admin revokes a traveler's QR code, the traveler's phone still shows the old cached QR code (from IndexedDB). There's no mechanism to invalidate the cache.
**Impact:** Traveler shows revoked QR at check-in, gets rejected, doesn't understand why.
**Fix:** Add a cache TTL or check token validity on app open.

### 9. CSV Import Doesn't Report Partial Failures Well
**Problem:** If a CSV has 1,000 rows and row 500 has a duplicate email, the entire transaction rolls back. The UI shows "0 imported" with no clear explanation.
**Impact:** Staff uploads a large CSV, nothing imports, they don't know which row caused the problem.
**Fix:** Import valid rows individually, skip failed rows, report each error.

### 10. No Session Invalidation on Logout
**Problem:** JWT tokens are stateless. When a user logs out, the token is still valid until it expires (24 hours).
**Impact:** On shared devices (staff tablets), the next user could access the previous user's session.
**Fix:** Implement token blacklist or use shorter token expiry with refresh tokens.

### 11. Audit Logs Cascade-Delete with Admin Account
**Problem:** If an admin account is deleted, all their audit log entries are also deleted (CASCADE).
**Impact:** Compliance violation — can't trace who made changes.
**Fix:** Change foreign key to SET NULL instead of CASCADE.

### 12. No Confirmation Before Destructive Actions
**Problem:** Deleting a traveler, changing check-in status, and force check-in have no confirmation dialog.
**Impact:** Accidental data changes that can't be undone.
**Fix:** Add confirmation dialogs for all destructive actions.

### 13. Multiple Staff Scanning Same Person
**Problem:** If two staff members scan the same traveler at different check-in points, both show "Checked In" because the scan state is local to each browser.
**Impact:** Duplicate check-ins, inaccurate headcounts.
**Fix:** Persist scans to database, check for existing scans before allowing new ones.

---

## 🟢 MEDIUM — Should Fix But Won't Block Operations

### 14. Taxi Card, Phrasebook, Currency, Emergency Pages
**Status:** Routes exist, basic UI exists, but data is hardcoded or minimal.
**Impact:** Travelers can access these pages but content may be incomplete.
**Fix:** Populate with real Beijing data before event.

### 15. Family Wallet Offline Support
**Problem:** Family member data only loads when online. If traveler never synced, family wallet is empty offline.
**Fix:** Pre-sync family data on first login.

### 16. Phone Numbers Not Masked for Admins
**Problem:** Email is masked but phone numbers are visible to all admins.
**Fix:** Add phone to the PII masking list.

### 17. No CSRF Protection
**Problem:** State-changing API endpoints (POST, PATCH, DELETE) have no CSRF token validation.
**Fix:** Add CSRF middleware.

### 18. Missing Database Indexes
**Problem:** No index on `traveler_flights(direction)`, `event_attendance(event_id)`, or `room_assignments(room_assignment_seq)`.
**Fix:** Add indexes for frequently-queried columns.

### 19. Room Assignment Seq Not Unique Per Hotel
**Problem:** Two travelers in different hotels could have the same `room_assignment_seq`, causing incorrect roommate grouping in the UI.
**Fix:** Add composite unique constraint `(hotel_id, room_assignment_seq)`.

### 20. Event Attendance Can't Be Updated
**Problem:** The `event_attendance` table exists but there's no UI or API to mark travelers as attended/no-show for specific events.
**Fix:** Add attendance update endpoint and UI.

### 21. Dispatch Engine Not Tested
**Problem:** Auto-dispatch service exists but has no tests and no UI.
**Fix:** Add tests and connect to ops panel.

### 22. CSV Export Missing Some Fields
**Problem:** CSV export doesn't include all 002-schema fields (smd_name, ceo_name, photo_url).
**Fix:** Update the export column list.

### 23. Stale Data After Inline Edits
**Problem:** After editing a cell in the master table, the entire page refreshes. If sort order changed, the edited row may move to a different position.
**Fix:** Use optimistic updates or highlight the edited row after refresh.

---

## Priority Action Plan

| Priority | Issue | Effort | When |
|---|---|---|---|
| 🔴 P0 | #1 Scanner race condition | 1 hour | Immediately |
| 🔴 P0 | #2 Persist scan check-ins to DB | 4 hours | This week |
| 🔴 P0 | #3 Flight/Hotel CRUD endpoints | 3 hours | This week |
| 🔴 P0 | #5 Remove or fix magic link tab | 30 min | This week |
| 🟡 P1 | #4 Rate limiting | 2 hours | Before UAT |
| 🟡 P1 | #6 Query optimization | 4 hours | Before UAT |
| 🟡 P1 | #9 CSV import error handling | 2 hours | Before UAT |
| 🟡 P1 | #12 Confirmation dialogs | 2 hours | Before UAT |
| 🟡 P1 | #13 Multi-staff scan sync | 4 hours | Before UAT |
| 🟢 P2 | #14 Toolkit content | 2 hours | Before event |
| 🟢 P2 | #18 Database indexes | 1 hour | Before event |
| 🟢 P2 | #20 Event attendance update | 3 hours | Before event |

**Total estimated effort:** ~28 hours of development work.

---

## What Works Well

- ✅ QR code generation and display (with offline caching)
- ✅ Master table with 40+ columns, inline editing, filtering, sorting, pagination
- ✅ Hotels drill-down with roommate grouping and check-in progress
- ✅ Flights drill-down with Group → Hotel passenger hierarchy
- ✅ Role-based permissions (Super Admin vs Admin view-only)
- ✅ CSV import and export
- ✅ Audit logging for all data changes
- ✅ Camera-based QR scanning (jsQR works on all phones)
- ✅ Wrong fleet detection with Deny/Force prompt
- ✅ PWA installable with offline support for core features
- ✅ Responsive design (mobile + desktop)
- ✅ Real-time notifications via SSE

---

*This report is based on static code analysis and architectural review. Load testing with 3,000 concurrent users is recommended before the event.*
