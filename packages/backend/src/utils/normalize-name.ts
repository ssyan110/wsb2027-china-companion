/**
 * Normalizes a traveler name for consistent storage and comparison.
 *
 * Pipeline: trim → lowercase → NFD decompose → strip combining marks → collapse whitespace
 *
 * @param raw - The raw name string to normalize
 * @returns The normalized name string
 */
export function normalizeName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics / combining marks
    .replace(/\s+/g, ' '); // collapse whitespace
}
