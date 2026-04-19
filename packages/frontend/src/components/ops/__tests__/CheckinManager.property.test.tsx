/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { render, screen, cleanup } from '@testing-library/react';
import { CheckinManager, getStatusBadgeClass } from '../CheckinManager';
import type { CheckinStatus } from '../CheckinManager';

// ─── Constants ───────────────────────────────────────────────

const ALL_STATUSES: CheckinStatus[] = ['pending', 'checked_in', 'no_show'];

const STATUS_TO_CLASS: Record<CheckinStatus, string> = {
  pending: 'badge-warning',
  checked_in: 'badge-success',
  no_show: 'badge-danger',
};

// ─── Generators ──────────────────────────────────────────────

const arbCheckinStatus = fc.constantFrom<CheckinStatus>(...ALL_STATUSES);

// ─── Property 9: Check-in status badge renders correct color class ──

/**
 * Feature: admin-panel, Property 9: Check-in status badge renders correct color class
 *
 * For any checkin_status value (pending, checked_in, no_show), the CheckinManager
 * badge should render with the corresponding CSS class: badge-warning for pending,
 * badge-success for checked_in, badge-danger for no_show.
 *
 * **Validates: Requirements 10.1**
 */
describe('Property 9: Check-in status badge renders correct color class', () => {
  afterEach(() => {
    cleanup();
  });

  it('getStatusBadgeClass returns correct class for every checkin_status', () => {
    fc.assert(
      fc.property(arbCheckinStatus, (status) => {
        const result = getStatusBadgeClass(status);
        expect(result).toBe(STATUS_TO_CLASS[status]);
      }),
      { numRuns: 100 },
    );
  });

  it('pending maps to badge-warning', () => {
    fc.assert(
      fc.property(fc.constant('pending' as CheckinStatus), (status) => {
        expect(getStatusBadgeClass(status)).toBe('badge-warning');
      }),
      { numRuns: 100 },
    );
  });

  it('checked_in maps to badge-success', () => {
    fc.assert(
      fc.property(fc.constant('checked_in' as CheckinStatus), (status) => {
        expect(getStatusBadgeClass(status)).toBe('badge-success');
      }),
      { numRuns: 100 },
    );
  });

  it('no_show maps to badge-danger', () => {
    fc.assert(
      fc.property(fc.constant('no_show' as CheckinStatus), (status) => {
        expect(getStatusBadgeClass(status)).toBe('badge-danger');
      }),
      { numRuns: 100 },
    );
  });

  it('rendered badge element contains the correct CSS class for any status', () => {
    fc.assert(
      fc.property(arbCheckinStatus, (status) => {
        const onStatusChange = vi.fn().mockResolvedValue(undefined);

        render(
          <CheckinManager
            travelerId="test-traveler-id"
            currentStatus={status}
            onStatusChange={onStatusChange}
          />,
        );

        const badge = screen.getByTestId('checkin-badge');
        const expectedClass = STATUS_TO_CLASS[status];

        // Verify the badge has the correct CSS class
        expect(badge.classList.contains(expectedClass)).toBe(true);

        // Verify it does NOT have the other status classes
        for (const [otherStatus, otherClass] of Object.entries(STATUS_TO_CLASS)) {
          if (otherStatus !== status) {
            expect(badge.classList.contains(otherClass)).toBe(false);
          }
        }

        cleanup();
      }),
      { numRuns: 100 },
    );
  });

  it('badge class mapping is exhaustive for all valid statuses', () => {
    fc.assert(
      fc.property(arbCheckinStatus, (status) => {
        const badgeClass = getStatusBadgeClass(status);
        // The result must be one of the three valid badge classes
        expect(['badge-warning', 'badge-success', 'badge-danger']).toContain(badgeClass);
        // And it must match the expected mapping
        expect(badgeClass).toBe(STATUS_TO_CLASS[status]);
      }),
      { numRuns: 100 },
    );
  });
});
