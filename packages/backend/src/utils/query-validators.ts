/**
 * Allowed column names for sorting master list results.
 *
 * Only columns that exist on the `travelers` table (or are meaningful
 * to ORDER BY) are included.  Aggregated/JSON columns are excluded
 * because PostgreSQL cannot ORDER BY an array or json column directly.
 */
export const ALLOWED_SORT_COLUMNS: readonly string[] = [
  'traveler_id',
  'booking_id',
  'full_name_raw',
  'full_name_normalized',
  'email_primary',
  'role_type',
  'access_status',
  'created_at',
  'updated_at',
  'first_name',
  'last_name',
  'age',
  'checkin_status',
  'invitee_type',
  'pax_type',
  'vip_tag',
  'internal_id',
  'agent_code',
] as const;

/**
 * Returns `true` when `column` is one of the allowed sort column names.
 */
export function validateSortColumn(column: string): boolean {
  return (ALLOWED_SORT_COLUMNS as readonly string[]).includes(column);
}

/**
 * Normalises a sort-order string to `'asc'` or `'desc'`.
 *
 * Returns `'desc'` for any value that is not exactly `'asc'` or `'desc'`
 * (including `undefined`).
 */
export function sanitizeSortOrder(order: string | undefined): 'asc' | 'desc' {
  if (order === 'asc' || order === 'desc') return order;
  return 'desc';
}

/**
 * Computes pagination metadata from raw query parameters and a total row count.
 *
 * - `page` defaults to 1 when missing or less than 1.
 * - `page_size` defaults to 50 when missing or less than 1, and is capped at 200.
 * - `total_pages` is `Math.ceil(total / effective_page_size)` (minimum 1 when total is 0).
 * - `offset` is `(effective_page - 1) * effective_page_size`.
 */
export function computePagination(
  params: { page?: number; page_size?: number },
  total: number,
): { page: number; page_size: number; total_pages: number; offset: number } {
  const page = params.page != null && params.page >= 1 ? Math.floor(params.page) : 1;
  const rawSize = params.page_size != null && params.page_size >= 1 ? Math.floor(params.page_size) : 50;
  const page_size = Math.min(rawSize, 200);
  const total_pages = total > 0 ? Math.ceil(total / page_size) : 1;
  const offset = (page - 1) * page_size;

  return { page, page_size, total_pages, offset };
}
