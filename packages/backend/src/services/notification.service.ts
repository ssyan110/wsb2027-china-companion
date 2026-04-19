import type { Pool } from 'pg';
import { EventEmitter } from 'events';
import type {
  NotificationItem,
  NotificationsResponse,
  NotificationRequest,
  NotificationTarget,
} from '@wsb/shared';

// ─── Types ───────────────────────────────────────────────────

export interface NotificationServiceDeps {
  db: Pool;
}

export interface NotFoundError {
  error: 'not_found';
  message: string;
}

export interface ValidationError {
  error: 'validation_error';
  message: string;
}

export interface PublishResult {
  notification_id: string;
  targets_count: number;
}

// ─── SSE Event Emitter (in-memory broadcast) ─────────────────

export const notificationEmitter = new EventEmitter();
notificationEmitter.setMaxListeners(5000); // support many concurrent SSE connections

// ─── Target Resolution ───────────────────────────────────────

export async function resolveTargets(
  db: Pool,
  targetType: NotificationTarget,
  targetId: string | undefined,
): Promise<string[]> {
  switch (targetType) {
    case 'all': {
      const result = await db.query(
        `SELECT traveler_id FROM travelers WHERE access_status IN ('activated', 'linked', 'rescued')`,
      );
      return result.rows.map((r: { traveler_id: string }) => r.traveler_id);
    }
    case 'group': {
      if (!targetId) return [];
      const result = await db.query(
        `SELECT traveler_id FROM traveler_groups WHERE group_id = $1`,
        [targetId],
      );
      return result.rows.map((r: { traveler_id: string }) => r.traveler_id);
    }
    case 'hotel': {
      if (!targetId) return [];
      const result = await db.query(
        `SELECT traveler_id FROM traveler_hotels WHERE hotel_id = $1`,
        [targetId],
      );
      return result.rows.map((r: { traveler_id: string }) => r.traveler_id);
    }
    case 'bus': {
      if (!targetId) return [];
      const result = await db.query(
        `SELECT traveler_id FROM bus_assignments WHERE bus_id = $1`,
        [targetId],
      );
      return result.rows.map((r: { traveler_id: string }) => r.traveler_id);
    }
    case 'individual': {
      if (!targetId) return [];
      return [targetId];
    }
    default:
      return [];
  }
}

// ─── Service Factory ─────────────────────────────────────────

export function createNotificationService(deps: NotificationServiceDeps) {
  const { db } = deps;

  /**
   * Publish a notification: insert into notifications table,
   * resolve targets, insert into traveler_notifications,
   * and emit SSE event.
   */
  async function publishNotification(
    request: NotificationRequest,
    createdBy: string,
  ): Promise<PublishResult | ValidationError> {
    const { title, body, target_type, target_id } = request;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return { error: 'validation_error', message: 'title is required' };
    }
    if (!body || typeof body !== 'string' || body.trim().length === 0) {
      return { error: 'validation_error', message: 'body is required' };
    }
    if (!target_type) {
      return { error: 'validation_error', message: 'target_type is required' };
    }
    // target_id required for non-'all' targets
    if (target_type !== 'all' && (!target_id || typeof target_id !== 'string')) {
      return { error: 'validation_error', message: 'target_id is required for non-all targets' };
    }

    const publishedAt = new Date().toISOString();

    // Insert notification
    const insertResult = await db.query(
      `INSERT INTO notifications (title, body, target_type, target_id, published_at, created_by)
       VALUES ($1, $2, $3::notification_target, $4, $5, $6)
       RETURNING notification_id`,
      [title.trim(), body.trim(), target_type, target_id ?? null, publishedAt, createdBy],
    );
    const notificationId = insertResult.rows[0].notification_id as string;

    // Resolve target traveler IDs
    const travelerIds = await resolveTargets(db, target_type, target_id);

    // Insert into traveler_notifications
    if (travelerIds.length > 0) {
      const values = travelerIds
        .map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`)
        .join(', ');
      const params = travelerIds.flatMap((tid) => [tid, notificationId]);
      await db.query(
        `INSERT INTO traveler_notifications (traveler_id, notification_id) VALUES ${values}
         ON CONFLICT DO NOTHING`,
        params,
      );
    }

    // Emit SSE event for real-time push
    const ssePayload: NotificationItem = {
      notification_id: notificationId,
      title: title.trim(),
      body: body.trim(),
      published_at: publishedAt,
      read_at: null,
    };
    for (const travelerId of travelerIds) {
      notificationEmitter.emit(`notification:${travelerId}`, ssePayload);
    }

    return { notification_id: notificationId, targets_count: travelerIds.length };
  }

  /**
   * Get notifications for a traveler, ordered by published_at desc.
   */
  async function getNotifications(
    travelerId: string,
  ): Promise<NotificationsResponse | NotFoundError> {
    // Verify traveler exists
    const travelerCheck = await db.query(
      `SELECT traveler_id FROM travelers WHERE traveler_id = $1`,
      [travelerId],
    );
    if (travelerCheck.rows.length === 0) {
      return { error: 'not_found', message: 'Traveler not found' };
    }

    const result = await db.query(
      `SELECT n.notification_id, n.title, n.body, n.published_at, tn.read_at
       FROM traveler_notifications tn
       JOIN notifications n ON n.notification_id = tn.notification_id
       WHERE tn.traveler_id = $1
       ORDER BY n.published_at DESC`,
      [travelerId],
    );

    const notifications: NotificationItem[] = result.rows.map((row) => ({
      notification_id: row.notification_id as string,
      title: row.title as string,
      body: row.body as string,
      published_at:
        row.published_at instanceof Date
          ? row.published_at.toISOString()
          : String(row.published_at),
      read_at:
        row.read_at instanceof Date
          ? row.read_at.toISOString()
          : row.read_at != null
            ? String(row.read_at)
            : null,
    }));

    return { notifications };
  }

  /**
   * Mark a notification as read for a traveler.
   */
  async function markAsRead(
    travelerId: string,
    notificationId: string,
  ): Promise<{ success: true } | NotFoundError> {
    const result = await db.query(
      `UPDATE traveler_notifications
       SET read_at = NOW()
       WHERE traveler_id = $1 AND notification_id = $2 AND read_at IS NULL
       RETURNING traveler_id`,
      [travelerId, notificationId],
    );

    if (result.rows.length === 0) {
      // Check if the record exists at all
      const check = await db.query(
        `SELECT traveler_id FROM traveler_notifications
         WHERE traveler_id = $1 AND notification_id = $2`,
        [travelerId, notificationId],
      );
      if (check.rows.length === 0) {
        return { error: 'not_found', message: 'Notification not found' };
      }
      // Already read — still success
    }

    return { success: true };
  }

  return { publishNotification, getNotifications, markAsRead };
}

export type NotificationService = ReturnType<typeof createNotificationService>;
