import type { MasterListRow } from '@wsb/shared';
import type { RoleType } from '@wsb/shared';

/**
 * Projects (filters) fields from a MasterListRow based on the requesting user's role.
 *
 * When the role is `admin`, the `email_aliases` and `guardian_id` keys are
 * removed from the returned object so they never leave the server.
 *
 * When the role is `super_admin`, all fields are returned unchanged.
 */
export function projectFieldsByRole(
  row: MasterListRow,
  role: RoleType,
): Partial<MasterListRow> {
  if (role === 'super_admin') {
    return { ...row };
  }

  // For admin (and any other role that reaches this code), strip restricted fields.
  const { email_aliases, guardian_id, ...projected } = row;
  return projected;
}
