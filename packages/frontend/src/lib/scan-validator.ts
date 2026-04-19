import type { ManifestEntry } from '@wsb/shared';

// ─── Types ───────────────────────────────────────────────────

export interface ScanResultPass {
  result: 'pass';
  traveler: ManifestEntry;
}

export interface ScanResultFail {
  result: 'fail';
  reason: 'unknown_qr';
}

export interface ScanResultWrongAssignment {
  result: 'wrong_assignment';
  traveler: ManifestEntry;
  reason: 'not_eligible_for_mode';
}

export type ScanValidationResult = ScanResultPass | ScanResultFail | ScanResultWrongAssignment;

/** Predefined override reason codes */
export const OVERRIDE_REASONS = [
  'Manager Approved',
  'Data Error',
  'VIP Exception',
  'Emergency',
] as const;

export type OverrideReason = (typeof OVERRIDE_REASONS)[number];

// ─── Pure Validation Functions ───────────────────────────────

/**
 * Validates a scanned QR token against the local manifest.
 * Runs entirely in-memory for <300ms performance.
 */
export function validateScan(
  qrToken: string,
  activeScanMode: string,
  manifest: Map<string, ManifestEntry>,
): ScanValidationResult {
  const entry = manifest.get(qrToken);
  if (!entry) {
    return { result: 'fail', reason: 'unknown_qr' };
  }
  if (!entry.eligibility.includes(activeScanMode)) {
    return { result: 'wrong_assignment', traveler: entry, reason: 'not_eligible_for_mode' };
  }
  return { result: 'pass', traveler: entry };
}

// ─── Batch Family Check-in ───────────────────────────────────

export interface BatchMemberResult {
  traveler: ManifestEntry;
  eligible: boolean;
}

export interface BatchCheckInResult {
  familyId: string;
  members: BatchMemberResult[];
  eligibleCount: number;
  totalCount: number;
}

/**
 * Given a family representative's QR token, finds all family members
 * in the manifest and checks each member's eligibility for the active scan mode.
 */
export function batchFamilyCheckIn(
  repQrToken: string,
  activeScanMode: string,
  manifest: Map<string, ManifestEntry>,
): BatchCheckInResult | null {
  const rep = manifest.get(repQrToken);
  if (!rep || !rep.family_id) return null;

  const members: BatchMemberResult[] = [];
  for (const entry of manifest.values()) {
    if (entry.family_id === rep.family_id) {
      members.push({
        traveler: entry,
        eligible: entry.eligibility.includes(activeScanMode),
      });
    }
  }

  return {
    familyId: rep.family_id,
    members,
    eligibleCount: members.filter((m) => m.eligible).length,
    totalCount: members.length,
  };
}

// ─── Override Validation ─────────────────────────────────────

/**
 * Validates that an override reason is one of the predefined codes.
 */
export function isValidOverrideReason(reason: string | undefined | null): reason is OverrideReason {
  if (!reason || reason.trim() === '') return false;
  return (OVERRIDE_REASONS as readonly string[]).includes(reason);
}
