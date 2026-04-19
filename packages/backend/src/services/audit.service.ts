import type { Pool } from 'pg';
import type { AuditEntry, AuditLogEntry, AuditLogResponse } from '@wsb/shared';

// ─── Types ───────────────────────────────────────────────────

export interface AuditServiceDeps {
  db: Pool;
}

export interface AuditLogFilters {
  start_date?: string;
  end_date?: string;
  action_type?: string;
  actor_id?: string;
  traveler_id?: string;
  page?: number;
  page_size?: number;
}

export interface ValidationError {
  error: 'validation_error';
  message: string;
}

// ─── Constants ───────────────────────────────────────────────

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
const RETENTION_MONTHS = 12;

// ─── Service Factory ─────────────────────────────────────────

export function createAuditService(deps: AuditServiceDeps) {
  const { db } = deps;

  /**
   * Log an audit event to the audit_logs table.
   * Requirements: 21.1, 21.2, 21.3
   */
  async function logAuditEvent(entry: AuditEntry): Promise<{ audit_id: string }> {
    const { actor_id, actor_role, action_type, entity_type, entity_id, details } = entry;

    const result = await db.query(
      `INSERT INTO audit_logs (actor_id, actor_role, action_type, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING audit_id`,
      [actor_id, actor_role, action_type, entity_type, entity_id, details ?? {}],
    );

    return { audit_id: result.rows[0].audit_id as string };
  }

  /**
   * Query audit logs with pagination and optional filters.
   * Requirements: 21.4
   */
  async function getAuditLogs(
    filters: AuditLogFilters = {},
  ): Promise<AuditLogResponse | ValidationError> {
    const page = Math.max(1, filters.page ?? DEFAULT_PAGE);
    const pageSize = Math.min(Math.max(1, filters.page_size ?? DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
    const offset = (page - 1) * pageSize;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters.start_date) {
      conditions.push(`created_at >= $${paramIndex}`);
      params.push(filters.start_date);
      paramIndex++;
    }

    if (filters.end_date) {
      conditions.push(`created_at <= $${paramIndex}`);
      params.push(filters.end_date);
      paramIndex++;
    }

    if (filters.action_type) {
      conditions.push(`action_type = $${paramIndex}`);
      params.push(filters.action_type);
      paramIndex++;
    }

    if (filters.actor_id) {
      conditions.push(`actor_id = $${paramIndex}`);
      params.push(filters.actor_id);
      paramIndex++;
    }

    if (filters.traveler_id) {
      conditions.push(`entity_type = 'traveler' AND entity_id = $${paramIndex}::uuid`);
      params.push(filters.traveler_id);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total matching rows
    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total FROM audit_logs ${whereClause}`,
      params,
    );
    const total = countResult.rows[0].total as number;

    // Fetch paginated results
    const dataParams = [...params, pageSize, offset];
    const dataResult = await db.query(
      `SELECT audit_id, actor_id, actor_role, action_type, entity_type, entity_id, details, created_at
       FROM audit_logs ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      dataParams,
    );

    const entries: AuditLogEntry[] = dataResult.rows.map((row) => ({
      audit_id: row.audit_id as string,
      actor_id: row.actor_id as string,
      actor_role: row.actor_role as string,
      action_type: row.action_type as string,
      entity_type: row.entity_type as string,
      entity_id: row.entity_id as string,
      details: (row.details ?? {}) as Record<string, unknown>,
      created_at:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at),
    }));

    return { entries, total, page, page_size: pageSize };
  }

  /**
   * Delete audit logs older than the retention period (12 months).
   * Requirements: 21.5
   */
  async function purgeExpiredLogs(): Promise<{ deleted: number }> {
    const result = await db.query(
      `DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '${RETENTION_MONTHS} months' RETURNING audit_id`,
    );
    return { deleted: result.rowCount ?? 0 };
  }

  return { logAuditEvent, getAuditLogs, purgeExpiredLogs };
}

export type AuditService = ReturnType<typeof createAuditService>;
