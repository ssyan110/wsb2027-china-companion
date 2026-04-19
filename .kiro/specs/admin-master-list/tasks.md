# Tasks

## Task 1: Shared Types and Utilities

- [x] 1.1 Add `MasterListRow`, `MasterListResponse`, and `MasterListQueryParams` types to `packages/shared/src/api-types.ts`
- [x] 1.2 Create `packages/backend/src/utils/field-masker.ts` with pure functions: `maskEmail`, `maskPhone`, `maskPassportName`, `maskFieldValue`, and `applyMasking`
- [x] 1.3 Create `packages/backend/src/utils/field-projection.ts` with `projectFieldsByRole` pure function that removes `email_aliases` and `guardian_id` for `admin` role
- [x] 1.4 Create `packages/backend/src/utils/query-validators.ts` with `ALLOWED_SORT_COLUMNS`, `validateSortColumn`, `sanitizeSortOrder`, and `computePagination` functions

## Task 2: Property-Based Tests for Pure Functions

- [x] 2.1 Create `packages/backend/src/utils/__tests__/field-masker.property.test.ts` with fast-check property tests for Property 2 (PII masking preserves structure) and Property 3 (masking respects role)
- [x] 2.2 Create `packages/backend/src/utils/__tests__/field-projection.property.test.ts` with fast-check property test for Property 4 (field projection by role)
- [x] 2.3 Create `packages/backend/src/utils/__tests__/query-validators.property.test.ts` with fast-check property tests for Property 1 (pagination envelope correctness) and Property 5 (sort column validation)

## Task 3: Master List Service

- [x] 3.1 Create `packages/backend/src/services/master-list.service.ts` with `createMasterListService` factory function
- [x] 3.2 Implement `query` method with CTE-based SQL JOIN query, dynamic WHERE/ORDER BY/LIMIT OFFSET, PII masking via `applyMasking`, and field projection via `projectFieldsByRole`
- [x] 3.3 Implement `exportCsv` async generator method that streams rows through a pg cursor in batches of 100, applies masking and projection, and yields CSV lines

## Task 4: Audit Logging Integration

- [x] 4.1 Add audit log calls in the master list service: `master_list.view` on query, `master_list.view_unmasked` when super_admin uses unmask=true, `master_list.export` on CSV export — all recorded before the response is sent
- [x] 4.2 Create `packages/backend/src/services/__tests__/master-list.service.test.ts` with unit tests for query parameter handling, audit logging calls, and error cases

## Task 5: Admin Routes

- [x] 5.1 Add `GET /api/v1/admin/master-list` route to `packages/backend/src/routes/admin.routes.ts` that parses query params, calls `masterListService.query`, and returns the `PaginationEnvelope` response
- [x] 5.2 Add `GET /api/v1/admin/master-list/export` route that parses query params, calls `masterListService.exportCsv`, sets CSV response headers (`Content-Type: text/csv`, `Content-Disposition: attachment`), and pipes the stream to the response
- [x] 5.3 Add input validation for `sort_by` (return 400 for invalid columns), `page`/`page_size` (positive integers), and `unmask` parameter (only effective for super_admin)

## Task 6: Frontend Store and Column Visibility

- [x] 6.1 Create `packages/frontend/src/stores/master-list.store.ts` Zustand store with state for data, pagination, search, filters, sort, loading, error, and visibleColumns
- [x] 6.2 Create `packages/frontend/src/components/ColumnVisibilityPanel.tsx` component with toggle switches for each column, localStorage persistence keyed by `traveler_id`, and default column set
- [x] 6.3 Create `packages/frontend/src/lib/__tests__/column-visibility.property.test.ts` with fast-check property test for Property 7 (column visibility round-trip) and Property 6 (filter predicate correctness)

## Task 7: Frontend Master List Page

- [x] 7.1 Create `packages/frontend/src/pages/AdminMasterList.tsx` page component with data table, search input (300ms debounce), filter dropdowns (role_type, access_status, group, hotel), column header sort, pagination controls (25/50/100/200), Export CSV button, loading indicator, and error state with retry
- [x] 7.2 Add route `/admin/master-list` to `packages/frontend/src/App.tsx` pointing to `AdminMasterList` component
- [x] 7.3 Ensure the table only renders columns present in the API response (respecting role-based field visibility) and that the ColumnVisibilityPanel updates its available columns accordingly
