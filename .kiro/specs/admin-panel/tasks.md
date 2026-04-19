# Implementation Plan: Admin Panel

## Overview

Extend the WSB 2027 backend and frontend to provide a dedicated `/ops/*` admin panel with a full-schema master table, inline editing, rich filtering, room/flight/event detail views, check-in management, CSV export, and audit-logged mutations. Implementation proceeds backend-first (shared types → query validators → service layer → routes) then frontend (store → layout → components → pages → routing).

## Tasks

- [x] 1. Extend shared types for the admin panel
  - [x] 1.1 Add `ExtendedMasterListRow`, `RoomAssignment`, `FlightDetail`, `EventAttendanceItem` interfaces to `packages/shared/src/api-types.ts`
    - Add `RoomAssignment` interface with `room_number`, `room_assignment_seq`, `hotel_confirmation_no`, `occupancy`, `paid_room_type`, `preferred_roommates`, `is_paid_room`, `hotel_name`
    - Add `FlightDetail` interface with `airline`, `flight_number`, `time`, `airport`, `terminal`
    - Add `EventAttendanceItem` interface with `event_name`, `fleet_number`, `attended`
    - Add `ExtendedMasterListRow` extending `MasterListRow` with all 002-schema scalar fields and structured related data (`room_assignment`, `arrival_flight`, `departure_flight`, `event_attendance`)
    - Add `ExtendedMasterListQueryParams` extending `MasterListQueryParams` with `invitee_type`, `pax_type`, `checkin_status`, `vip_tag`, `agent_code`
    - _Requirements: 2.1, 2.2, 7.1, 8.1, 9.1, 14.1, 14.2, 14.3, 14.4_

- [x] 2. Extend backend query validators and master list service
  - [x] 2.1 Extend `ALLOWED_SORT_COLUMNS` in `packages/backend/src/utils/query-validators.ts`
    - Add `first_name`, `last_name`, `age`, `checkin_status`, `invitee_type`, `pax_type`, `vip_tag`, `internal_id`, `agent_code` to the allowed sort columns array
    - _Requirements: 6.4, 6.5, 14.6_

  - [x] 2.2 Write property test for extended sort column validation
    - **Property 7: Sort column validation accepts extended columns and rejects others**
    - **Validates: Requirements 6.5, 14.6**

  - [x] 2.3 Extend `buildWhereClause` in `packages/backend/src/services/master-list.service.ts` to support new filter parameters
    - Add conditions for `invitee_type`, `pax_type`, `checkin_status`, `vip_tag`, `agent_code` query parameters
    - Each filter produces a parameterized WHERE condition with AND logic
    - _Requirements: 5.3, 5.6, 14.5_

  - [x] 2.4 Write property test for extended filter WHERE clause generation
    - **Property 6: Multiple filters produce AND-joined WHERE conditions**
    - **Validates: Requirements 5.3**

  - [x] 2.5 Write property test for single filter parameter producing corresponding WHERE condition
    - **Property 14: Filter parameter produces corresponding WHERE condition**
    - **Validates: Requirements 14.5**

  - [x] 2.6 Extend the master list CTE in `master-list.service.ts` with new sub-CTEs and SELECT columns
    - Add `room_assignments_agg` CTE joining `room_assignments` with `hotels`
    - Add `arrival_flight_agg` CTE joining `traveler_flights` (direction='arrival') with `flights`
    - Add `departure_flight_agg` CTE joining `traveler_flights` (direction='departure') with `flights`
    - Add `event_attendance_agg` CTE joining `event_attendance` with `events`
    - Extend `SELECT_COLUMNS` with all 002-schema scalar columns and aggregated columns
    - Extend `FROM_JOINS` with LEFT JOINs for the new CTEs
    - Extend `mapRow` to map all new fields into `ExtendedMasterListRow`
    - Extend `exportCsv` to include all new columns in CSV output
    - _Requirements: 2.1, 2.2, 7.3, 8.2, 9.2, 14.1, 14.2, 14.3, 14.4_

  - [x] 2.7 Write property test for CSV export containing all extended fields
    - **Property 13: CSV export row contains all extended fields**
    - **Validates: Requirements 11.2**

- [x] 3. Extend admin service for 002-schema field updates with audit logging
  - [x] 3.1 Extend `UpdateTravelerInput` in `packages/backend/src/services/admin.service.ts` with all 002-schema editable fields
    - Add `first_name`, `last_name`, `gender`, `age`, `invitee_type`, `registration_type`, `pax_type`, `vip_tag`, `internal_id`, `agent_code`, `party_total`, `party_adults`, `party_children`, `dietary_vegan`, `dietary_notes`, `remarks`, `checkin_status`, `onsite_flight_change`, `jba_repeat`, `smd_name`, `ceo_name`
    - _Requirements: 3.6, 14.1_

  - [x] 3.2 Extend `updateTraveler` to handle all new fields, fetch previous values, and log granular audit entries
    - Dynamically build SET clauses for any provided 002-schema field
    - Before UPDATE, fetch current row to capture previous values
    - After UPDATE, call `auditService.logAuditEvent` with `action_type: 'traveler.field_update'` (or `'traveler.checkin_update'` for checkin_status changes) including field name, previous value, and new value
    - Use a database transaction so audit write failure rolls back the data change (fail-closed)
    - Inject `auditService` dependency into `createAdminService`
    - _Requirements: 3.2, 10.3, 10.4, 12.1, 12.2, 12.3, 12.4, 12.5_

  - [x] 3.3 Write property test for check-in status change audit entry
    - **Property 10: Check-in status change produces correct audit entry**
    - **Validates: Requirements 10.4, 12.3**

  - [x] 3.4 Write property test for field update audit entry with previous and new values
    - **Property 11: Field update produces audit entry with previous and new values**
    - **Validates: Requirements 12.1**

  - [x] 3.5 Write property test for audit entries always containing actor_id and actor_role
    - **Property 12: Every audit entry contains actor_id and actor_role**
    - **Validates: Requirements 12.4**

- [x] 4. Extend admin routes for new query parameters and PATCH validation
  - [x] 4.1 Update `GET /api/v1/admin/master-list` route in `packages/backend/src/routes/admin.routes.ts` to parse new query parameters
    - Parse `invitee_type`, `pax_type`, `checkin_status`, `vip_tag`, `agent_code` from `req.query` and pass to `masterListService.query`
    - _Requirements: 5.6, 14.5_

  - [x] 4.2 Update `PATCH /api/v1/admin/travelers/:id` route to validate enum fields and pass actor context
    - Validate `gender`, `invitee_type`, `pax_type`, `checkin_status` against allowed enum values, return 400 for invalid values
    - Pass `actor` object (`{ id: adminId, role: req.role }`) to `adminService.updateTraveler` for audit logging
    - _Requirements: 3.2, 12.4_

  - [x] 4.3 Write unit tests for extended admin routes
    - Test new query parameter parsing for master-list endpoint
    - Test enum validation on PATCH endpoint
    - _Requirements: 5.6, 3.2_

- [x] 5. Checkpoint - Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Create ops panel Zustand store
  - [x] 6.1 Create `packages/frontend/src/stores/ops-panel.store.ts`
    - Implement `OpsPanelState` with data, pagination, search, filters (`OpsFilters`), sort, loading/error, editingCell, expandedRows, unmaskPii state
    - Implement `fetchData` action that builds query params (including new filters and `unmask` flag) and calls `GET /api/v1/admin/master-list`
    - Implement `patchTraveler` action that calls `PATCH /api/v1/admin/travelers/:id` and refreshes data on success
    - Implement `setSearch` (with page reset), `setFilter` (with page reset), `clearFilters`, `setSort` (with toggle logic), `setPage`, `setPageSize`, `setEditingCell`, `toggleExpandedRow`, `setUnmaskPii`
    - _Requirements: 1.4, 2.4, 2.5, 4.2, 4.3, 4.4, 5.1, 5.2, 5.4, 5.5, 6.1, 6.2_

  - [x] 6.2 Write property test for search/filter change resetting page to 1
    - **Property 4: Search or filter change resets page to 1**
    - **Validates: Requirements 4.3, 5.2**

  - [x] 6.3 Write property test for active filter count
    - **Property 5: Active filter count equals non-empty filter values**
    - **Validates: Requirements 5.4**

  - [x] 6.4 Write property test for sort direction toggle
    - **Property 8: Sort direction toggles on repeated column click**
    - **Validates: Requirements 6.2**

- [x] 7. Create OpsLayout with sidebar navigation and role guard
  - [x] 7.1 Create `packages/frontend/src/components/ops/OpsLayout.tsx`
    - Sidebar navigation with links: Master Table (`/ops/travelers`), Rooms (`/ops/rooms`), Flights (`/ops/flights`), Events (`/ops/events`), Audit Log (`/ops/audit`)
    - Role guard: check `auth.store` role, redirect non-admin/super_admin users to `/login`
    - Header with "Unmask PII" toggle visible only to `super_admin` role, wired to `ops-panel.store.setUnmaskPii`
    - Render `<Outlet />` for child routes
    - _Requirements: 1.1, 1.2, 1.3, 13.6_

  - [x] 7.2 Write property test for role-based route guard
    - **Property 1: Role-based route guard rejects non-admin roles**
    - **Validates: Requirements 1.3**

- [x] 8. Create InlineEditor component
  - [x] 8.1 Create `packages/frontend/src/components/ops/InlineEditor.tsx`
    - Accept `travelerId`, `field`, `value`, `fieldType` ('text' | 'number' | 'select' | 'checkbox'), `options`, `onSave`, `onCancel` props
    - Render `<select>` for enum fields, `<input type="checkbox">` for booleans, `<input type="number">` for numerics, `<input type="text">` for strings
    - Enter or blur triggers `onSave` → PATCH API call via store
    - Escape triggers `onCancel` → restores original value
    - Show spinner during save, revert and show toast on error
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.7_

  - [x] 8.2 Write property test for editable field type determining input control
    - **Property 2: Editable field type determines input control**
    - **Validates: Requirements 3.1, 3.7**

  - [x] 8.3 Write property test for edit cancellation restoring original value
    - **Property 3: Edit cancellation restores original value**
    - **Validates: Requirements 3.3, 3.5**

- [x] 9. Create FilterBar and CheckinManager components
  - [x] 9.1 Create `packages/frontend/src/components/ops/FilterBar.tsx`
    - Dropdown filters for: group, sub-group, hotel, `invitee_type`, `pax_type`, `checkin_status`, `vip_tag`
    - Active filter count badge
    - "Clear All Filters" button wired to `ops-panel.store.clearFilters`
    - _Requirements: 5.1, 5.4, 5.5_

  - [x] 9.2 Create `packages/frontend/src/components/ops/CheckinManager.tsx`
    - Color-coded badge: yellow (`pending`), green (`checked_in`), red (`no_show`)
    - Click opens dropdown to select new status
    - Status change calls `ops-panel.store.patchTraveler` with `checkin_status` field
    - _Requirements: 10.1, 10.2, 10.3_

  - [x] 9.3 Write property test for check-in status badge color mapping
    - **Property 9: Check-in status badge renders correct color class**
    - **Validates: Requirements 10.1**

- [x] 10. Create OpsMasterTable page with all column rendering
  - [x] 10.1 Create `packages/frontend/src/pages/ops/OpsMasterTable.tsx`
    - Render all columns from `ExtendedMasterListRow`: traveler scalars, room assignment columns, arrival/departure flight columns, event attendance summary
    - Horizontal scroll with sticky `first_name` + `last_name` columns
    - Click-to-edit cells via `InlineEditor` for editable fields (per Requirement 3.6)
    - Expandable rows for event attendance detail (click event cell to expand)
    - Room assignment columns with visual grouping by `room_assignment_seq` (matching background color)
    - Flight `onsite_flight_change` badge/icon indicator
    - Sort indicators on column headers, wired to `ops-panel.store.setSort`
    - Pagination footer with current page, total pages, total count, page size selector (25, 50, 100, 200)
    - Integrate `FilterBar` and `SearchBar` (debounced 300ms input wired to `ops-panel.store.setSearch`)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.6, 4.1, 4.2, 6.1, 6.2, 6.3, 7.1, 7.2, 8.1, 8.3, 8.4, 9.1, 9.3_

  - [x] 10.2 Write unit tests for OpsMasterTable
    - Test column headers render
    - Test pagination controls
    - Test empty state
    - _Requirements: 2.1, 2.5_

- [x] 11. Create CSV export control and remaining ops pages
  - [x] 11.1 Add CSV export button to OpsMasterTable
    - Trigger download from `GET /api/v1/admin/master-list/export` with all current filter, search, sort, and `unmask` parameters
    - Set filename to `admin-panel-export-YYYY-MM-DD.csv`
    - Show toast on error
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 11.2 Create placeholder pages for remaining ops views
    - Create `packages/frontend/src/pages/ops/OpsRooms.tsx` — Room assignment view grouped by `room_assignment_seq`
    - Create `packages/frontend/src/pages/ops/OpsFlights.tsx` — Flight details view
    - Create `packages/frontend/src/pages/ops/OpsEvents.tsx` — Event attendance view
    - Create `packages/frontend/src/pages/ops/OpsAuditLog.tsx` — Audit log viewer (reuses existing audit-logs endpoint)
    - _Requirements: 1.1, 1.2_

- [x] 12. Wire ops routes into App.tsx
  - [x] 12.1 Add `/ops/*` route tree to `packages/frontend/src/App.tsx`
    - Add `<Route path="/ops" element={<OpsLayout />}>` with child routes for `travelers`, `rooms`, `flights`, `events`, `audit`
    - Index route redirects to `/ops/travelers`
    - Keep existing `/admin/*` routes untouched
    - _Requirements: 1.1, 1.4, 1.5_

  - [x] 12.2 Write unit tests for ops routing
    - Test `/ops` redirects to `/ops/travelers`
    - Test non-admin role redirects to login
    - _Requirements: 1.1, 1.3_

- [x] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The existing `/admin/*` routes and `master-list.store.ts` remain untouched — the ops panel is fully isolated per Requirement 1.4
