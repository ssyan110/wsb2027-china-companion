# Requirements Document

## Introduction

The Admin Master List System provides JBA staff (admin and super_admin roles) with a comprehensive, privacy-compliant view of all traveler data stored in the `travelers` table and its related tables (groups, hotels, flights, bus assignments, QR tokens, families). The existing `AdminTravelers` page only displays five columns (Name, Email, Role, Status, Family). This feature extends it into a full "Master List" view with all database columns, related entity data via JOINs, server-side search/filter/sort, paginated results, CSV export with audit trail, PII field masking, and role-based field visibility — all in compliance with US privacy law (including state-level regulations such as CCPA).

## Glossary

- **Master_List_API**: The backend endpoint (`GET /api/v1/admin/master-list`) that returns paginated, joined traveler data with all master list columns from the `travelers` table and related tables.
- **Master_List_View**: The frontend React page that renders the full master list table with column visibility toggles, search, filter, sort, and export controls.
- **PII_Field**: A database column containing Personally Identifiable Information. In this system: `email_primary`, `email_aliases`, `phone`, and `passport_name`.
- **Field_Masker**: A backend utility that replaces PII field values with masked representations (e.g., `j***@example.com`, `***-***-1234`) based on the requesting user's role.
- **Column_Visibility_Manager**: A frontend component that allows staff to toggle which columns are visible in the Master List table and persists preferences in browser localStorage.
- **Export_Service**: A backend service that generates CSV files from master list query results, records an audit log entry for each export, and streams the file to the client.
- **Audit_Logger**: The existing `audit.service.ts` module that writes entries to the `audit_logs` table, extended to log data-access events (reads and exports) in addition to mutations.
- **RBAC_Gate**: The existing `rbac.ts` middleware that restricts `/api/v1/admin/*` routes to `admin` and `super_admin` roles.
- **Admin_User**: A traveler with `role_type` of `admin` or `super_admin`.
- **Pagination_Envelope**: A JSON response wrapper containing `data`, `total`, `page`, `page_size`, and `total_pages` fields.

## Requirements

### Requirement 1: Master List API with Full Column JOINs

**User Story:** As an Admin_User, I want to retrieve all traveler records with their related entity data in a single API call, so that I can see the complete master list without making multiple requests.

#### Acceptance Criteria

1. WHEN an Admin_User sends a GET request to `/api/v1/admin/master-list`, THE Master_List_API SHALL return traveler records joined with data from `traveler_groups`/`groups`, `traveler_hotels`/`hotels`, `traveler_flights`/`flights`, `bus_assignments`/`buses`, `qr_tokens`, and `families`.
2. THE Master_List_API SHALL include the following fields for each traveler: `traveler_id`, `booking_id`, `family_id`, `representative_id`, `guardian_id`, `full_name_raw`, `full_name_normalized`, `email_primary`, `email_aliases`, `passport_name`, `phone`, `role_type`, `access_status`, `created_at`, `updated_at`, plus aggregated `groups` (array of group names), `hotels` (array of hotel names), `flights` (array of flight numbers with arrival times), `bus_assignments` (array of bus numbers with event names), and `qr_active` (boolean indicating whether an active QR token exists).
3. THE Master_List_API SHALL return results wrapped in a Pagination_Envelope with `page` defaulting to 1 and `page_size` defaulting to 50.
4. WHEN the `page` or `page_size` query parameters are provided, THE Master_List_API SHALL return the corresponding page of results with `page_size` capped at 200.
5. IF the requesting user does not have `admin` or `super_admin` role, THEN THE RBAC_Gate SHALL return HTTP 403 with an error message.

### Requirement 2: Server-Side Search, Filter, and Sort

**User Story:** As an Admin_User, I want to search, filter, and sort the master list on the server, so that I can quickly find specific travelers without loading all records into the browser.

#### Acceptance Criteria

1. WHEN the `q` query parameter is provided, THE Master_List_API SHALL perform a case-insensitive search across `full_name_normalized`, `email_primary`, `booking_id`, and `phone` fields using PostgreSQL trigram matching.
2. WHEN the `role_type` query parameter is provided, THE Master_List_API SHALL filter results to only include travelers with the specified role.
3. WHEN the `access_status` query parameter is provided, THE Master_List_API SHALL filter results to only include travelers with the specified access status.
4. WHEN the `group_id` query parameter is provided, THE Master_List_API SHALL filter results to only include travelers belonging to the specified group.
5. WHEN the `hotel_id` query parameter is provided, THE Master_List_API SHALL filter results to only include travelers assigned to the specified hotel.
6. WHEN the `sort_by` query parameter is provided with a valid column name and optional `sort_order` (`asc` or `desc`), THE Master_List_API SHALL sort results by the specified column in the specified direction, defaulting to `created_at` descending.
7. IF the `sort_by` parameter contains a column name not in the allowed list, THEN THE Master_List_API SHALL return HTTP 400 with a validation error message.

### Requirement 3: PII Field Masking

**User Story:** As a system operator, I want PII fields to be masked by default so that sensitive traveler data is not exposed unnecessarily, in compliance with US privacy regulations.

#### Acceptance Criteria

1. THE Field_Masker SHALL mask `email_primary` by showing only the first character, an asterisk sequence, and the domain (e.g., `j***@example.com`).
2. THE Field_Masker SHALL mask `phone` by replacing all digits except the last four with asterisks (e.g., `***-***-1234`).
3. THE Field_Masker SHALL mask `passport_name` by showing only the first character and last character with asterisks in between (e.g., `J*** E`).
4. THE Field_Masker SHALL mask each entry in `email_aliases` using the same pattern as `email_primary`.
5. WHEN an Admin_User with `super_admin` role sends a request with the `unmask=true` query parameter, THE Master_List_API SHALL return unmasked PII field values.
6. WHEN an Admin_User with `admin` role sends a request with `unmask=true`, THE Master_List_API SHALL ignore the parameter and return masked PII field values.
7. THE Field_Masker SHALL be implemented as a pure function that accepts a field value and field type, and returns the masked string, so that masking logic is testable independently of the HTTP layer.

### Requirement 4: Audit Logging for Data Access

**User Story:** As a compliance officer, I want every access to the master list (both views and exports) to be recorded in the audit log, so that data access can be reviewed during privacy audits.

#### Acceptance Criteria

1. WHEN an Admin_User accesses the Master_List_API, THE Audit_Logger SHALL record an entry with `action_type` set to `master_list.view`, `entity_type` set to `traveler_list`, the `actor_id` set to the requesting user's `traveler_id`, and `details` containing the query parameters used (filters, search term, page, sort).
2. WHEN an Admin_User requests an unmasked view (super_admin with `unmask=true`), THE Audit_Logger SHALL record an entry with `action_type` set to `master_list.view_unmasked` and `details` containing the query parameters.
3. WHEN an Admin_User exports the master list to CSV, THE Audit_Logger SHALL record an entry with `action_type` set to `master_list.export`, `entity_type` set to `traveler_list`, and `details` containing the export filters and the number of records exported.
4. THE Audit_Logger SHALL record the audit entry before the response is sent to the client, so that the audit trail is complete even if the client disconnects.

### Requirement 5: CSV Export with Audit Trail

**User Story:** As an Admin_User, I want to export the current master list view (with applied filters) to a CSV file, so that I can work with the data in spreadsheet software.

#### Acceptance Criteria

1. WHEN an Admin_User sends a GET request to `/api/v1/admin/master-list/export`, THE Export_Service SHALL generate a CSV file containing all records matching the current filter and search parameters.
2. THE Export_Service SHALL apply the same PII masking rules as the Master_List_API based on the requesting user's role (masked for `admin`, unmasked for `super_admin` with `unmask=true`).
3. THE Export_Service SHALL set the HTTP response headers to `Content-Type: text/csv` and `Content-Disposition: attachment; filename="master-list-YYYY-MM-DD.csv"` where the date is the current UTC date.
4. THE Export_Service SHALL stream the CSV response using chunked transfer encoding to avoid loading all records into memory at once.
5. IF no records match the applied filters, THEN THE Export_Service SHALL return a CSV file containing only the header row.

### Requirement 6: Column Visibility Toggle

**User Story:** As an Admin_User, I want to show or hide specific columns in the master list table, so that I can focus on the data relevant to my current task.

#### Acceptance Criteria

1. THE Master_List_View SHALL display a column visibility control that lists all available columns with toggle switches.
2. WHEN an Admin_User toggles a column off, THE Master_List_View SHALL hide that column from the table immediately without reloading data from the server.
3. WHEN an Admin_User toggles a column on, THE Master_List_View SHALL show that column in the table immediately without reloading data from the server.
4. THE Column_Visibility_Manager SHALL persist the user's column visibility preferences in browser localStorage keyed by the user's `traveler_id`.
5. WHEN the Master_List_View loads, THE Column_Visibility_Manager SHALL restore the user's previously saved column visibility preferences from localStorage.
6. IF no saved preferences exist, THEN THE Column_Visibility_Manager SHALL display a default set of columns: `full_name_raw`, `email_primary`, `booking_id`, `role_type`, `access_status`, `groups`, `hotels`, and `qr_active`.

### Requirement 7: Frontend Master List Page

**User Story:** As an Admin_User, I want a dedicated Master List page in the admin UI that presents all traveler data in a sortable, filterable table with pagination controls, so that I can efficiently browse and manage traveler records.

#### Acceptance Criteria

1. THE Master_List_View SHALL render a data table displaying traveler records fetched from the Master_List_API.
2. THE Master_List_View SHALL display pagination controls showing the current page, total pages, and page size selector (25, 50, 100, 200 records per page).
3. WHEN an Admin_User clicks a column header, THE Master_List_View SHALL sort the table by that column by sending a new request to the Master_List_API with the appropriate `sort_by` and `sort_order` parameters.
4. THE Master_List_View SHALL display a search input that debounces input by 300 milliseconds before sending a search request to the Master_List_API.
5. THE Master_List_View SHALL display filter dropdowns for `role_type`, `access_status`, `group`, and `hotel` that send filter parameters to the Master_List_API.
6. THE Master_List_View SHALL display an "Export CSV" button that triggers a download from the `/api/v1/admin/master-list/export` endpoint with the current filter and search parameters.
7. WHILE the Master_List_API request is in progress, THE Master_List_View SHALL display a loading indicator and disable interactive controls to prevent duplicate requests.
8. IF the Master_List_API returns an error, THEN THE Master_List_View SHALL display an error message with a retry button.

### Requirement 8: Role-Based Field Visibility

**User Story:** As a system operator, I want to restrict which fields are visible based on the admin user's role, so that the principle of least privilege is enforced for sensitive data access.

#### Acceptance Criteria

1. WHEN an Admin_User with `admin` role accesses the Master_List_API, THE Master_List_API SHALL exclude the `email_aliases` and `guardian_id` fields from the response.
2. WHEN an Admin_User with `super_admin` role accesses the Master_List_API, THE Master_List_API SHALL include all fields in the response.
3. THE Master_List_View SHALL only render columns for fields present in the API response, so that excluded fields are not shown as empty columns.
4. THE Column_Visibility_Manager SHALL update its available column list based on the fields returned by the Master_List_API for the current user's role.
