# Requirements Document

## Introduction

The Admin Panel is a dedicated operational tool for JBA staff (admin and super_admin roles) to manage all traveler records during the WSB 2027 China tour. Unlike the existing basic admin pages embedded in the traveler frontend app, this panel is a separate route tree (`/ops/*`) purpose-built for JBA operations staff. It provides a comprehensive master table with all traveler fields from the updated schema (matching the WSB 2025 Master List CSV structure), inline cell editing, multi-field search, rich filtering, room assignment views grouped by roommate sequence, flight details, event attendance tracking, check-in status management, CSV export, audit logging, and role-based PII visibility. The panel consumes the existing `/api/v1/admin/*` backend endpoints and extends them where needed for inline editing and expanded data views.

## Glossary

- **Admin_Panel**: The dedicated frontend route tree at `/ops/*` for JBA operations staff, separate from the traveler-facing app routes.
- **Master_Table**: The primary data table in the Admin_Panel displaying all traveler records with columns from the `travelers` table and related tables (`room_assignments`, `flights`, `event_attendance`, `groups`, `hotels`).
- **Inline_Editor**: A UI component that converts a table cell into an editable input when clicked, submitting changes via PATCH to the backend on blur or Enter key.
- **Admin_API**: The existing backend endpoints under `/api/v1/admin/*` that serve traveler data, master list queries, and entity management.
- **Room_Assignment_View**: A display component that groups travelers by `room_assignment_seq` to show roommate pairings, room numbers, occupancy type, and hotel confirmation numbers.
- **Flight_Detail_View**: A display component showing arrival and departure flight information (airline, flight number, direction, time, airport/terminal) for each traveler.
- **Event_Attendance_View**: A display component showing per-event fleet numbers and attendance status for each traveler.
- **Checkin_Manager**: A UI control that allows staff to update a traveler's `checkin_status` between `pending`, `checked_in`, and `no_show`.
- **Filter_Bar**: A toolbar component with dropdown filters for group, sub-group, hotel, invitee_type, pax_type, checkin_status, and vip_tag.
- **Search_Bar**: A text input that searches across `full_name_normalized`, `email_primary`, `booking_id`, `phone`, and `agent_code`.
- **CSV_Exporter**: A frontend control that triggers a CSV download from the export endpoint with the currently applied filters.
- **Audit_Logger**: The existing `audit.service.ts` module that records all data mutations to the `audit_logs` table.
- **PII_Field**: A column containing Personally Identifiable Information: `email_primary`, `email_aliases`, `phone`, `passport_name`.
- **Field_Masker**: The existing backend utility that masks PII fields based on the requesting user's role.
- **Admin_User**: A traveler record with `role_type` of `admin` or `super_admin`.
- **RBAC_Gate**: The existing `rbac.ts` middleware restricting `/api/v1/admin/*` to `admin` and `super_admin` roles.

## Requirements

### Requirement 1: Separate Admin Panel Route Tree

**User Story:** As a JBA operations staff member, I want a dedicated admin panel at a separate route path, so that the operational tool is cleanly separated from the traveler-facing app.

#### Acceptance Criteria

1. THE Admin_Panel SHALL be accessible at the `/ops` route path and its sub-routes (`/ops/travelers`, `/ops/rooms`, `/ops/flights`, `/ops/events`).
2. THE Admin_Panel SHALL have its own layout component with a sidebar navigation listing all operational views (Master Table, Rooms, Flights, Events, Audit Log).
3. WHEN a user without `admin` or `super_admin` role navigates to any `/ops/*` route, THE Admin_Panel SHALL redirect the user to the login page.
4. THE Admin_Panel SHALL not share React component state or Zustand stores with the traveler-facing app pages at `/admin/*`.
5. THE Admin_Panel SHALL be implemented within the existing `packages/frontend` package as a separate route tree, not as a separate package.

### Requirement 2: Master Table with Full Schema Columns

**User Story:** As a JBA operations staff member, I want to see all traveler fields from the updated database schema in a single table, so that I have a complete operational view matching the WSB Master List CSV structure.

#### Acceptance Criteria

1. THE Master_Table SHALL display the following traveler columns: `first_name`, `last_name`, `full_name_raw`, `gender`, `age`, `invitee_type`, `registration_type`, `pax_type`, `vip_tag`, `internal_id`, `agent_code`, `booking_id`, `email_primary`, `phone`, `passport_name`, `party_total`, `party_adults`, `party_children`, `dietary_vegan`, `dietary_notes`, `remarks`, `repeat_attendee`, `jba_repeat`, `checkin_status`, `onsite_flight_change`, `smd_name`, `ceo_name`.
2. THE Master_Table SHALL display aggregated related data columns: group names, sub-group names, hotel name, room number, room occupancy, arrival flight details, departure flight details.
3. THE Master_Table SHALL support horizontal scrolling for the wide column set with sticky first-name and last-name columns.
4. WHEN the Admin_Panel loads, THE Master_Table SHALL fetch data from the `GET /api/v1/admin/master-list` endpoint with default pagination (page 1, page size 50).
5. THE Master_Table SHALL display a pagination footer showing current page, total pages, total record count, and page size selector (25, 50, 100, 200).

### Requirement 3: Inline Cell Editing

**User Story:** As a JBA operations staff member, I want to click on a table cell to edit its value directly, so that I can update traveler information without navigating to a separate form.

#### Acceptance Criteria

1. WHEN an Admin_User clicks on an editable cell in the Master_Table, THE Inline_Editor SHALL replace the cell content with an appropriate input control (text input, dropdown, or checkbox) matching the field type.
2. WHEN the Admin_User presses Enter or clicks outside the Inline_Editor, THE Inline_Editor SHALL submit the changed value via `PATCH /api/v1/admin/travelers/:id` to the Admin_API.
3. WHEN the Admin_User presses Escape while editing, THE Inline_Editor SHALL discard the change and restore the original cell value.
4. WHILE a PATCH request is in progress, THE Inline_Editor SHALL display a loading indicator on the cell and prevent further edits to that cell.
5. IF the PATCH request fails, THEN THE Inline_Editor SHALL restore the original cell value and display a toast notification with the error message.
6. THE Inline_Editor SHALL support editing the following fields: `first_name`, `last_name`, `gender`, `age`, `invitee_type`, `registration_type`, `pax_type`, `vip_tag`, `internal_id`, `agent_code`, `party_total`, `party_adults`, `party_children`, `dietary_vegan`, `dietary_notes`, `remarks`, `checkin_status`, `onsite_flight_change`, `smd_name`, `ceo_name`.
7. THE Inline_Editor SHALL use dropdown selects for enum fields (`gender`, `invitee_type`, `pax_type`, `checkin_status`) and checkboxes for boolean fields (`dietary_vegan`, `onsite_flight_change`, `jba_repeat`).

### Requirement 4: Multi-Field Search

**User Story:** As a JBA operations staff member, I want to search across name, email, booking ID, phone, and agent code simultaneously, so that I can quickly find any traveler record.

#### Acceptance Criteria

1. THE Search_Bar SHALL accept free-text input and search across `full_name_normalized`, `email_primary`, `booking_id`, `phone`, and `agent_code` fields.
2. THE Search_Bar SHALL debounce input by 300 milliseconds before sending a search request to the Admin_API.
3. WHEN a search term is entered, THE Master_Table SHALL reset to page 1 and display only matching results.
4. WHEN the search term is cleared, THE Master_Table SHALL display all records with the current filter and sort settings.
5. THE Admin_API SHALL perform case-insensitive search using PostgreSQL trigram matching across the specified fields.

### Requirement 5: Rich Filtering

**User Story:** As a JBA operations staff member, I want to filter the master table by group, sub-group, hotel, invitee type, pax type, check-in status, and VIP tag, so that I can focus on specific segments of travelers.

#### Acceptance Criteria

1. THE Filter_Bar SHALL provide dropdown filters for: group (top-level), sub-group, hotel, `invitee_type`, `pax_type`, `checkin_status`, and `vip_tag`.
2. WHEN a filter value is selected, THE Master_Table SHALL reset to page 1 and display only matching results by sending the filter parameter to the Admin_API.
3. WHEN multiple filters are selected simultaneously, THE Admin_API SHALL apply all filters with AND logic.
4. THE Filter_Bar SHALL display the count of active filters as a badge.
5. THE Filter_Bar SHALL provide a "Clear All Filters" button that resets all filter dropdowns and reloads the unfiltered data.
6. THE Admin_API SHALL support filtering by `invitee_type`, `pax_type`, `checkin_status`, and `vip_tag` query parameters in addition to the existing `role_type`, `access_status`, `group_id`, and `hotel_id` parameters.

### Requirement 6: Column Sorting

**User Story:** As a JBA operations staff member, I want to sort the master table by any column, so that I can organize records by the field most relevant to my current task.

#### Acceptance Criteria

1. WHEN an Admin_User clicks a column header in the Master_Table, THE Master_Table SHALL sort by that column in ascending order by sending a `sort_by` parameter to the Admin_API.
2. WHEN an Admin_User clicks the same column header again, THE Master_Table SHALL toggle the sort direction between ascending and descending.
3. THE Master_Table SHALL display a sort direction indicator (arrow) on the currently sorted column header.
4. THE Admin_API SHALL support sorting by all traveler columns including `first_name`, `last_name`, `age`, `checkin_status`, `invitee_type`, `pax_type`, `vip_tag`, `internal_id`, `agent_code`, `created_at`, and `updated_at`.
5. IF the `sort_by` parameter contains a column name not in the allowed list, THEN THE Admin_API SHALL return HTTP 400 with a validation error message.

### Requirement 7: Room Assignment Details

**User Story:** As a JBA operations staff member, I want to see room assignment details including room number, occupancy type, and roommate groupings, so that I can manage hotel logistics.

#### Acceptance Criteria

1. THE Master_Table SHALL display room assignment columns: `room_number`, `occupancy` type, `paid_room_type`, `hotel_confirmation_no`, and `preferred_roommates`.
2. THE Room_Assignment_View SHALL group travelers with the same `room_assignment_seq` value visually (e.g., matching background color or grouping indicator) so that roommate pairings are immediately apparent.
3. THE Admin_API SHALL include room assignment data from the `room_assignments` table joined to each traveler record in the master list response.
4. WHEN an Admin_User edits a room assignment field via the Inline_Editor, THE Admin_Panel SHALL submit the change via `PATCH /api/v1/admin/travelers/:id` or a dedicated room assignment endpoint.

### Requirement 8: Flight Details Display

**User Story:** As a JBA operations staff member, I want to see arrival and departure flight details for each traveler, so that I can coordinate airport transfers.

#### Acceptance Criteria

1. THE Flight_Detail_View SHALL display separate columns for arrival flight (airline, flight number, arrival time, terminal) and departure flight (airline, flight number, departure time, terminal).
2. THE Admin_API SHALL include flight data from the `traveler_flights` and `flights` tables, separated by `direction` (arrival vs departure), in the master list response.
3. WHEN a traveler has the `onsite_flight_change` flag set to true, THE Flight_Detail_View SHALL display a visual indicator (badge or icon) next to the flight details.
4. THE Inline_Editor SHALL allow updating the `onsite_flight_change` boolean flag for a traveler.

### Requirement 9: Event Attendance Tracking

**User Story:** As a JBA operations staff member, I want to see event attendance with fleet numbers for each traveler, so that I can track participation across tour events.

#### Acceptance Criteria

1. THE Event_Attendance_View SHALL display a summary of event assignments showing event name, fleet number, and attendance status (attended, not attended, pending) for each traveler.
2. THE Admin_API SHALL include event attendance data from the `event_attendance` table joined to each traveler record in the master list response.
3. WHEN an Admin_User clicks on the event attendance cell, THE Admin_Panel SHALL display an expandable detail view showing all events for that traveler with their fleet numbers and attendance status.

### Requirement 10: Check-In Status Management

**User Story:** As a JBA operations staff member, I want to update a traveler's check-in status directly from the master table, so that I can manage arrivals efficiently during the tour.

#### Acceptance Criteria

1. THE Checkin_Manager SHALL display the current `checkin_status` value (`pending`, `checked_in`, `no_show`) as a color-coded badge in the Master_Table.
2. WHEN an Admin_User clicks the check-in status badge, THE Checkin_Manager SHALL display a dropdown allowing selection of `pending`, `checked_in`, or `no_show`.
3. WHEN a new status is selected, THE Checkin_Manager SHALL submit the change via `PATCH /api/v1/admin/travelers/:id` with the updated `checkin_status` value.
4. THE Audit_Logger SHALL record the check-in status change with `action_type` set to `traveler.checkin_update`, the previous status, and the new status in the `details` field.

### Requirement 11: CSV Export with Current Filters

**User Story:** As a JBA operations staff member, I want to export the currently filtered master table to a CSV file, so that I can share data with colleagues or work offline in spreadsheet software.

#### Acceptance Criteria

1. THE CSV_Exporter SHALL trigger a download from `GET /api/v1/admin/master-list/export` with all currently applied filter, search, and sort parameters.
2. THE exported CSV SHALL include all columns visible in the Master_Table including the extended schema fields (`first_name`, `last_name`, `gender`, `age`, `invitee_type`, `pax_type`, `vip_tag`, `internal_id`, `agent_code`, room assignment details, flight details).
3. THE Export_Service SHALL apply PII masking rules based on the requesting user's role (masked for `admin`, unmasked for `super_admin` with `unmask=true`).
4. THE Export_Service SHALL set HTTP response headers to `Content-Type: text/csv` and `Content-Disposition: attachment; filename="admin-panel-export-YYYY-MM-DD.csv"` where the date is the current UTC date.
5. THE Audit_Logger SHALL record the export with `action_type` set to `master_list.export`, including the applied filters and the number of records exported.

### Requirement 12: Audit Logging for All Changes

**User Story:** As a compliance officer, I want every data modification made through the admin panel to be recorded in the audit log, so that all changes are traceable.

#### Acceptance Criteria

1. WHEN an Admin_User updates a traveler field via the Inline_Editor, THE Audit_Logger SHALL record an entry with `action_type` set to `traveler.field_update`, `entity_type` set to `traveler`, `entity_id` set to the traveler's UUID, and `details` containing the field name, previous value, and new value.
2. WHEN an Admin_User updates a room assignment, THE Audit_Logger SHALL record an entry with `action_type` set to `room_assignment.update` and `details` containing the changed fields.
3. WHEN an Admin_User updates a check-in status, THE Audit_Logger SHALL record an entry with `action_type` set to `traveler.checkin_update` and `details` containing the previous and new status values.
4. THE Audit_Logger SHALL record the `actor_id` (the admin user's `traveler_id`) and `actor_role` for every audit entry.
5. THE Audit_Logger SHALL record the audit entry before the success response is sent to the client, so that the audit trail is complete even if the client disconnects.

### Requirement 13: Role-Based Access and PII Visibility

**User Story:** As a system operator, I want to enforce role-based access where admin users see most fields with PII masked, and super_admin users see everything including unmasked PII, so that the principle of least privilege is maintained.

#### Acceptance Criteria

1. WHEN an Admin_User with `admin` role accesses the Admin_Panel, THE Admin_API SHALL return PII fields (`email_primary`, `phone`, `passport_name`, `email_aliases`) in masked form using the Field_Masker.
2. WHEN an Admin_User with `super_admin` role accesses the Admin_Panel with `unmask=true`, THE Admin_API SHALL return all PII fields in unmasked form.
3. WHEN an Admin_User with `admin` role accesses the Admin_Panel, THE Admin_API SHALL exclude `email_aliases` and `guardian_id` fields from the response.
4. WHEN an Admin_User with `super_admin` role accesses the Admin_Panel, THE Admin_API SHALL include all fields in the response.
5. IF a user without `admin` or `super_admin` role attempts to access any `/api/v1/admin/*` endpoint, THEN THE RBAC_Gate SHALL return HTTP 403.
6. THE Admin_Panel SHALL display an "Unmask PII" toggle visible only to `super_admin` users that sends the `unmask=true` parameter with API requests.

### Requirement 14: Extended Master List API for New Schema Fields

**User Story:** As a JBA operations staff member, I want the master list API to return all fields from the updated schema (002_master_list_schema.sql), so that the admin panel can display the complete traveler profile.

#### Acceptance Criteria

1. THE Admin_API SHALL include the following additional fields in the master list response: `first_name`, `last_name`, `gender`, `age`, `invitee_type`, `registration_type`, `pax_type`, `vip_tag`, `internal_id`, `agent_code`, `party_total`, `party_adults`, `party_children`, `dietary_vegan`, `dietary_notes`, `remarks`, `repeat_attendee`, `jba_repeat`, `checkin_status`, `onsite_flight_change`, `smd_name`, `ceo_name`, `photo_url`.
2. THE Admin_API SHALL include room assignment data as a nested object: `room_number`, `room_assignment_seq`, `hotel_confirmation_no`, `occupancy`, `paid_room_type`, `preferred_roommates`, `is_paid_room`.
3. THE Admin_API SHALL include flight data separated by direction: an `arrival_flight` object (airline, flight_number, arrival_time, airport, terminal) and a `departure_flight` object (airline, flight_number, departure_time, airport, terminal).
4. THE Admin_API SHALL include event attendance data as an array of objects: `event_name`, `fleet_number`, `attended`.
5. THE Admin_API SHALL support filtering by `invitee_type`, `pax_type`, `checkin_status`, `vip_tag`, and `agent_code` query parameters.
6. THE Admin_API SHALL support sorting by `first_name`, `last_name`, `age`, `checkin_status`, `invitee_type`, `pax_type`, `vip_tag`, `internal_id`, and `agent_code` in addition to existing sort columns.
