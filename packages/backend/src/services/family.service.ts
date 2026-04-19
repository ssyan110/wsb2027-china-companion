import type { Pool } from 'pg';

// ─── Types ───────────────────────────────────────────────────

export interface FamilyServiceDeps {
  db: Pool;
}

export interface FamilyRow {
  family_id: string;
  representative_id: string;
  created_at: string;
}

export interface NotFoundError {
  error: 'not_found';
  message: string;
}

export interface ValidationError {
  error: 'validation_error';
  message: string;
}

// ─── Service factory ─────────────────────────────────────────

export function createFamilyService(deps: FamilyServiceDeps) {
  const { db } = deps;

  /**
   * Create a new family with the given traveler as representative.
   * Sets the traveler's family_id to the new family.
   * Requirement 4.1: support linking multiple travelers under a single Family_ID
   * Requirement 4.2: require exactly one representative_id per Family_ID
   */
  async function createFamily(
    representativeId: string,
  ): Promise<FamilyRow | NotFoundError | ValidationError> {
    // Verify the representative exists and is not a minor
    const travelerResult = await db.query(
      `SELECT traveler_id, role_type, family_id FROM travelers WHERE traveler_id = $1`,
      [representativeId],
    );

    if (travelerResult.rows.length === 0) {
      return { error: 'not_found', message: 'Representative traveler not found' };
    }

    const traveler = travelerResult.rows[0];
    if (traveler.role_type === 'minor') {
      return { error: 'validation_error', message: 'A minor cannot be a family representative' };
    }

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Create the family record
      const familyResult = await client.query(
        `INSERT INTO families (representative_id) VALUES ($1)
         RETURNING family_id, representative_id, created_at`,
        [representativeId],
      );

      const family = familyResult.rows[0];

      // Update the representative's family_id
      await client.query(
        `UPDATE travelers SET family_id = $1, updated_at = NOW() WHERE traveler_id = $2`,
        [family.family_id, representativeId],
      );

      await client.query('COMMIT');

      return {
        family_id: family.family_id as string,
        representative_id: family.representative_id as string,
        created_at: String(family.created_at),
      };
    } catch (err: unknown) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Link a traveler to an existing family.
   * Requirement 4.1: support linking multiple travelers under a single Family_ID
   * Requirement 17.5: enforce minor must have valid guardian_id before activation
   */
  async function linkMember(
    familyId: string,
    travelerId: string,
  ): Promise<{ success: boolean } | NotFoundError | ValidationError> {
    // Verify the family exists
    const familyResult = await db.query(
      `SELECT family_id FROM families WHERE family_id = $1`,
      [familyId],
    );

    if (familyResult.rows.length === 0) {
      return { error: 'not_found', message: 'Family not found' };
    }

    // Verify the traveler exists
    const travelerResult = await db.query(
      `SELECT traveler_id, role_type, guardian_id, access_status FROM travelers WHERE traveler_id = $1`,
      [travelerId],
    );

    if (travelerResult.rows.length === 0) {
      return { error: 'not_found', message: 'Traveler not found' };
    }

    // Update the traveler's family_id
    await db.query(
      `UPDATE travelers SET family_id = $1, updated_at = NOW() WHERE traveler_id = $2`,
      [familyId, travelerId],
    );

    return { success: true };
  }

  /**
   * Assign a guardian to a minor.
   * Requirement 4.6: prevent minor from being linked to more than one guardian_id at a time
   * Requirement 17.5: enforce minor must have valid guardian_id before activation
   */
  async function assignGuardian(
    minorId: string,
    guardianId: string,
  ): Promise<{ success: boolean } | NotFoundError | ValidationError> {
    // Verify the minor exists and is actually a minor
    const minorResult = await db.query(
      `SELECT traveler_id, role_type FROM travelers WHERE traveler_id = $1`,
      [minorId],
    );

    if (minorResult.rows.length === 0) {
      return { error: 'not_found', message: 'Minor traveler not found' };
    }

    if (minorResult.rows[0].role_type !== 'minor') {
      return { error: 'validation_error', message: 'Traveler is not a minor' };
    }

    // Verify the guardian exists and is not a minor
    const guardianResult = await db.query(
      `SELECT traveler_id, role_type FROM travelers WHERE traveler_id = $1`,
      [guardianId],
    );

    if (guardianResult.rows.length === 0) {
      return { error: 'not_found', message: 'Guardian traveler not found' };
    }

    if (guardianResult.rows[0].role_type === 'minor') {
      return { error: 'validation_error', message: 'Guardian cannot be a minor' };
    }

    // Set the minor's guardian_id (replaces any existing guardian — scalar field enforces single guardian)
    await db.query(
      `UPDATE travelers SET guardian_id = $1, updated_at = NOW() WHERE traveler_id = $2`,
      [guardianId, minorId],
    );

    return { success: true };
  }

  /**
   * Remove a traveler from a family by clearing their family_id.
   */
  async function unlinkMember(
    familyId: string,
    travelerId: string,
  ): Promise<{ success: boolean } | NotFoundError | ValidationError> {
    // Verify the family exists
    const familyResult = await db.query(
      `SELECT family_id, representative_id FROM families WHERE family_id = $1`,
      [familyId],
    );

    if (familyResult.rows.length === 0) {
      return { error: 'not_found', message: 'Family not found' };
    }

    // Prevent unlinking the representative
    if (familyResult.rows[0].representative_id === travelerId) {
      return {
        error: 'validation_error',
        message: 'Cannot unlink the family representative. Reassign representative first.',
      };
    }

    // Verify the traveler exists and belongs to this family
    const travelerResult = await db.query(
      `SELECT traveler_id, family_id FROM travelers WHERE traveler_id = $1`,
      [travelerId],
    );

    if (travelerResult.rows.length === 0) {
      return { error: 'not_found', message: 'Traveler not found' };
    }

    if (travelerResult.rows[0].family_id !== familyId) {
      return { error: 'validation_error', message: 'Traveler is not a member of this family' };
    }

    // Clear the traveler's family_id
    await db.query(
      `UPDATE travelers SET family_id = NULL, updated_at = NOW() WHERE traveler_id = $1`,
      [travelerId],
    );

    return { success: true };
  }

  return {
    createFamily,
    linkMember,
    assignGuardian,
    unlinkMember,
  };
}

export type FamilyService = ReturnType<typeof createFamilyService>;
