import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createNotificationService,
  resolveTargets,
  notificationEmitter,
} from '../notification.service.js';

// ─── Mock helpers ────────────────────────────────────────────

function createMockDb(queryResponses: Array<{ rows: Record<string, unknown>[] }> = []) {
  let callIndex = 0;
  return {
    query: vi.fn().mockImplementation(() => {
      const response = queryResponses[callIndex] ?? { rows: [] };
      callIndex++;
      return Promise.resolve(response);
    }),
  } as unknown as import('pg').Pool;
}

// ─── resolveTargets tests ────────────────────────────────────

describe('resolveTargets', () => {
  it('should return all active traveler IDs for target_type "all"', async () => {
    const db = createMockDb([
      { rows: [{ traveler_id: 'tid-1' }, { traveler_id: 'tid-2' }] },
    ]);

    const result = await resolveTargets(db, 'all', undefined);
    expect(result).toEqual(['tid-1', 'tid-2']);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('access_status'),
    );
  });

  it('should return traveler IDs by group for target_type "group"', async () => {
    const db = createMockDb([
      { rows: [{ traveler_id: 'tid-3' }, { traveler_id: 'tid-4' }] },
    ]);

    const result = await resolveTargets(db, 'group', 'grp-1');
    expect(result).toEqual(['tid-3', 'tid-4']);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('traveler_groups'),
      ['grp-1'],
    );
  });

  it('should return traveler IDs by hotel for target_type "hotel"', async () => {
    const db = createMockDb([
      { rows: [{ traveler_id: 'tid-5' }] },
    ]);

    const result = await resolveTargets(db, 'hotel', 'htl-1');
    expect(result).toEqual(['tid-5']);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('traveler_hotels'),
      ['htl-1'],
    );
  });

  it('should return traveler IDs by bus for target_type "bus"', async () => {
    const db = createMockDb([
      { rows: [{ traveler_id: 'tid-6' }] },
    ]);

    const result = await resolveTargets(db, 'bus', 'bus-1');
    expect(result).toEqual(['tid-6']);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('bus_assignments'),
      ['bus-1'],
    );
  });

  it('should return single traveler ID for target_type "individual"', async () => {
    const db = createMockDb([]);

    const result = await resolveTargets(db, 'individual', 'tid-7');
    expect(result).toEqual(['tid-7']);
    expect(db.query).not.toHaveBeenCalled();
  });

  it('should return empty array for group without target_id', async () => {
    const db = createMockDb([]);
    const result = await resolveTargets(db, 'group', undefined);
    expect(result).toEqual([]);
  });

  it('should return empty array for hotel without target_id', async () => {
    const db = createMockDb([]);
    const result = await resolveTargets(db, 'hotel', undefined);
    expect(result).toEqual([]);
  });

  it('should return empty array for bus without target_id', async () => {
    const db = createMockDb([]);
    const result = await resolveTargets(db, 'bus', undefined);
    expect(result).toEqual([]);
  });

  it('should return empty array for individual without target_id', async () => {
    const db = createMockDb([]);
    const result = await resolveTargets(db, 'individual', undefined);
    expect(result).toEqual([]);
  });
});

// ─── publishNotification tests ───────────────────────────────

describe('NotificationService.publishNotification', () => {
  let emittedEvents: Array<{ event: string; data: unknown }>;

  beforeEach(() => {
    emittedEvents = [];
  });

  afterEach(() => {
    notificationEmitter.removeAllListeners();
  });

  it('should return validation error when title is missing', async () => {
    const db = createMockDb([]);
    const service = createNotificationService({ db });

    const result = await service.publishNotification(
      { title: '', body: 'test', target_type: 'all' },
      'admin-1',
    );
    expect(result).toEqual({ error: 'validation_error', message: 'title is required' });
  });

  it('should return validation error when body is missing', async () => {
    const db = createMockDb([]);
    const service = createNotificationService({ db });

    const result = await service.publishNotification(
      { title: 'Test', body: '', target_type: 'all' },
      'admin-1',
    );
    expect(result).toEqual({ error: 'validation_error', message: 'body is required' });
  });

  it('should return validation error when target_id missing for group target', async () => {
    const db = createMockDb([]);
    const service = createNotificationService({ db });

    const result = await service.publishNotification(
      { title: 'Test', body: 'Body', target_type: 'group' },
      'admin-1',
    );
    expect(result).toEqual({
      error: 'validation_error',
      message: 'target_id is required for non-all targets',
    });
  });

  it('should create notification and resolve targets for "all"', async () => {
    const db = createMockDb([
      // 1. INSERT notification
      { rows: [{ notification_id: 'notif-1' }] },
      // 2. resolveTargets: all active travelers
      { rows: [{ traveler_id: 'tid-1' }, { traveler_id: 'tid-2' }] },
      // 3. INSERT traveler_notifications
      { rows: [] },
    ]);
    const service = createNotificationService({ db });

    // Listen for SSE events
    notificationEmitter.on('notification:tid-1', (data) => {
      emittedEvents.push({ event: 'notification:tid-1', data });
    });
    notificationEmitter.on('notification:tid-2', (data) => {
      emittedEvents.push({ event: 'notification:tid-2', data });
    });

    const result = await service.publishNotification(
      { title: 'Alert', body: 'Bus change', target_type: 'all' },
      'admin-1',
    );

    expect(result).toEqual({ notification_id: 'notif-1', targets_count: 2 });
    expect(db.query).toHaveBeenCalledTimes(3);
    expect(emittedEvents).toHaveLength(2);
    expect(emittedEvents[0].data).toMatchObject({
      notification_id: 'notif-1',
      title: 'Alert',
      body: 'Bus change',
      read_at: null,
    });
  });

  it('should create notification for individual target', async () => {
    const db = createMockDb([
      // 1. INSERT notification
      { rows: [{ notification_id: 'notif-2' }] },
      // 2. INSERT traveler_notifications (individual — no resolveTargets query)
      { rows: [] },
    ]);
    const service = createNotificationService({ db });

    const result = await service.publishNotification(
      { title: 'Personal', body: 'Your bus changed', target_type: 'individual', target_id: 'tid-5' },
      'admin-1',
    );

    expect(result).toEqual({ notification_id: 'notif-2', targets_count: 1 });
    // INSERT notification + INSERT traveler_notifications (no resolveTargets query for individual)
    expect(db.query).toHaveBeenCalledTimes(2);
  });

  it('should handle zero targets gracefully', async () => {
    const db = createMockDb([
      // 1. INSERT notification
      { rows: [{ notification_id: 'notif-3' }] },
      // 2. resolveTargets: empty group
      { rows: [] },
    ]);
    const service = createNotificationService({ db });

    const result = await service.publishNotification(
      { title: 'Test', body: 'Body', target_type: 'group', target_id: 'grp-empty' },
      'admin-1',
    );

    expect(result).toEqual({ notification_id: 'notif-3', targets_count: 0 });
    // INSERT notification + resolveTargets query, but no INSERT traveler_notifications
    expect(db.query).toHaveBeenCalledTimes(2);
  });
});

// ─── getNotifications tests ──────────────────────────────────

describe('NotificationService.getNotifications', () => {
  it('should return not_found when traveler does not exist', async () => {
    const db = createMockDb([{ rows: [] }]);
    const service = createNotificationService({ db });

    const result = await service.getNotifications('nonexistent');
    expect(result).toEqual({ error: 'not_found', message: 'Traveler not found' });
  });

  it('should return notifications ordered by published_at desc', async () => {
    const db = createMockDb([
      // 1. traveler exists
      { rows: [{ traveler_id: 'tid-1' }] },
      // 2. notifications query
      {
        rows: [
          {
            notification_id: 'notif-2',
            title: 'Later',
            body: 'Later body',
            published_at: '2027-06-02T10:00:00Z',
            read_at: null,
          },
          {
            notification_id: 'notif-1',
            title: 'Earlier',
            body: 'Earlier body',
            published_at: '2027-06-01T10:00:00Z',
            read_at: '2027-06-01T11:00:00Z',
          },
        ],
      },
    ]);
    const service = createNotificationService({ db });

    const result = await service.getNotifications('tid-1');
    expect(result).not.toHaveProperty('error');

    const response = result as { notifications: unknown[] };
    expect(response.notifications).toHaveLength(2);
    expect((response.notifications[0] as { notification_id: string }).notification_id).toBe('notif-2');
    expect((response.notifications[1] as { notification_id: string }).notification_id).toBe('notif-1');
    expect((response.notifications[1] as { read_at: string | null }).read_at).toBe('2027-06-01T11:00:00Z');
  });

  it('should return empty notifications array when traveler has none', async () => {
    const db = createMockDb([
      { rows: [{ traveler_id: 'tid-1' }] },
      { rows: [] },
    ]);
    const service = createNotificationService({ db });

    const result = await service.getNotifications('tid-1');
    expect(result).toEqual({ notifications: [] });
  });
});

// ─── markAsRead tests ────────────────────────────────────────

describe('NotificationService.markAsRead', () => {
  it('should mark notification as read successfully', async () => {
    const db = createMockDb([
      // UPDATE returns the updated row
      { rows: [{ traveler_id: 'tid-1' }] },
    ]);
    const service = createNotificationService({ db });

    const result = await service.markAsRead('tid-1', 'notif-1');
    expect(result).toEqual({ success: true });
  });

  it('should return not_found when notification does not exist', async () => {
    const db = createMockDb([
      // UPDATE returns nothing (no match)
      { rows: [] },
      // Check query also returns nothing
      { rows: [] },
    ]);
    const service = createNotificationService({ db });

    const result = await service.markAsRead('tid-1', 'notif-nonexistent');
    expect(result).toEqual({ error: 'not_found', message: 'Notification not found' });
  });

  it('should return success when notification is already read', async () => {
    const db = createMockDb([
      // UPDATE returns nothing (already read, read_at IS NOT NULL)
      { rows: [] },
      // Check query finds the record (it exists but is already read)
      { rows: [{ traveler_id: 'tid-1' }] },
    ]);
    const service = createNotificationService({ db });

    const result = await service.markAsRead('tid-1', 'notif-already-read');
    expect(result).toEqual({ success: true });
  });
});
