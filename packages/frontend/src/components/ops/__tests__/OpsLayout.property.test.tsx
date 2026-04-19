/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuthStore } from '../../../stores/auth.store';
import { OpsLayout } from '../OpsLayout';
import type { RoleType } from '@wsb/shared';

// ─── Generators ──────────────────────────────────────────────

/** Non-admin roles that should be rejected by the route guard */
const NON_ADMIN_ROLES: RoleType[] = ['traveler', 'minor', 'representative', 'staff', 'staff_desk'];

const arbNonAdminRole = fc.constantFrom(...NON_ADMIN_ROLES);

/** Admin roles that should be allowed */
const ADMIN_ROLES: RoleType[] = ['admin', 'super_admin'];

const arbAdminRole = fc.constantFrom(...ADMIN_ROLES);

/** Ops routes that should be guarded */
const OPS_ROUTES = ['/ops/travelers', '/ops/rooms', '/ops/flights', '/ops/events', '/ops/audit'];

const arbOpsRoute = fc.constantFrom(...OPS_ROUTES);

// ─── Helpers ─────────────────────────────────────────────────

function renderOpsLayout(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <OpsLayout />
    </MemoryRouter>,
  );
}

// ─── Property 1: Role-based route guard rejects non-admin roles ──

/**
 * Feature: admin-panel, Property 1: Role-based route guard rejects non-admin roles
 *
 * For any role type that is not admin or super_admin (i.e., traveler, minor,
 * representative, staff, staff_desk), when that user attempts to access any
 * /ops/* route, the OpsLayout component should redirect to the login page
 * and not render any operational content.
 *
 * **Validates: Requirements 1.3**
 */
describe('Property 1: Role-based route guard rejects non-admin roles', () => {
  afterEach(() => {
    cleanup();
  });

  it('redirects non-admin roles and does not render ops content', () => {
    fc.assert(
      fc.property(arbNonAdminRole, arbOpsRoute, (role, route) => {
        // Set auth state with the non-admin role
        useAuthStore.setState({
          role,
          isAuthenticated: true,
          session_token: 'test-token',
          traveler_id: 'test-id',
        });

        renderOpsLayout(route);

        // Should NOT render any sidebar navigation or ops content
        expect(screen.queryByLabelText('Operations navigation')).toBeNull();
        expect(screen.queryByText('Operations Panel')).toBeNull();
        expect(screen.queryByText('Master Table')).toBeNull();

        cleanup();
      }),
      { numRuns: 100 },
    );
  });

  it('redirects when role is null (unauthenticated)', () => {
    fc.assert(
      fc.property(arbOpsRoute, (route) => {
        useAuthStore.setState({
          role: null,
          isAuthenticated: false,
          session_token: null,
          traveler_id: null,
        });

        renderOpsLayout(route);

        expect(screen.queryByLabelText('Operations navigation')).toBeNull();
        expect(screen.queryByText('Operations Panel')).toBeNull();

        cleanup();
      }),
      { numRuns: 100 },
    );
  });

  it('allows admin roles to see ops content', () => {
    fc.assert(
      fc.property(arbAdminRole, arbOpsRoute, (role, route) => {
        useAuthStore.setState({
          role,
          isAuthenticated: true,
          session_token: 'test-token',
          traveler_id: 'test-id',
        });

        renderOpsLayout(route);

        // Should render the sidebar and header
        expect(screen.getByLabelText('Operations navigation')).toBeDefined();
        expect(screen.getByText('Operations Panel')).toBeDefined();
        expect(screen.getByText('Master Table')).toBeDefined();
        expect(screen.getByText('Rooms')).toBeDefined();
        expect(screen.getByText('Flights')).toBeDefined();
        expect(screen.getByText('Events')).toBeDefined();
        expect(screen.getByText('Audit Log')).toBeDefined();

        cleanup();
      }),
      { numRuns: 100 },
    );
  });

  it('shows Unmask PII toggle only for super_admin', () => {
    // super_admin should see the toggle
    useAuthStore.setState({
      role: 'super_admin',
      isAuthenticated: true,
      session_token: 'test-token',
      traveler_id: 'test-id',
    });

    renderOpsLayout('/ops/travelers');
    expect(screen.getByLabelText('Unmask PII')).toBeDefined();
    cleanup();

    // admin should NOT see the toggle
    useAuthStore.setState({
      role: 'admin',
      isAuthenticated: true,
      session_token: 'test-token',
      traveler_id: 'test-id',
    });

    renderOpsLayout('/ops/travelers');
    expect(screen.queryByLabelText('Unmask PII')).toBeNull();
    cleanup();
  });
});
