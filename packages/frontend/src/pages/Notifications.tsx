import { useEffect, useState, useRef, useCallback } from 'react';
import { apiClient } from '../lib/api';
import { getDb } from '../lib/db';
import { useAuthStore } from '../stores/auth.store';
import { SkeletonList } from '../components/Skeleton';
import type { NotificationItem } from '@wsb/shared';

export default function Notifications() {
  const token = useAuthStore((s) => s.session_token);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const sseRef = useRef<EventSource | null>(null);

  const fetchNotifications = useCallback(async () => {
    const db = await getDb();

    try {
      const { notifications: fetched } = await apiClient<{ notifications: NotificationItem[] }>(
        '/api/v1/travelers/me/notifications',
      );
      setNotifications(fetched);

      // Cache
      const tx = db.transaction('notifications', 'readwrite');
      await tx.store.clear();
      for (const n of fetched) {
        await tx.store.put(n);
      }
      await tx.done;
    } catch {
      // Fallback to cache
      const cached = await db.getAll('notifications');
      cached.sort(
        (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime(),
      );
      setNotifications(cached);
    }

    setLoading(false);
  }, []);

  // Initial fetch + fetch missed on app open
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // SSE for real-time push
  useEffect(() => {
    if (!token) return;

    try {
      const sse = new EventSource(`/api/v1/notifications/stream?token=${encodeURIComponent(token)}`);
      sseRef.current = sse;

      sse.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as NotificationItem;
          setNotifications((prev) => {
            // Avoid duplicates
            if (prev.some((n) => n.notification_id === data.notification_id)) return prev;
            return [data, ...prev];
          });
          // Cache the new notification
          getDb().then((db) => db.put('notifications', data));
        } catch {
          // ignore parse errors
        }
      };

      sse.onerror = () => {
        sse.close();
      };
    } catch {
      // SSE not supported or failed
    }

    return () => {
      sseRef.current?.close();
    };
  }, [token]);

  const markAsRead = async (notificationId: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) =>
        n.notification_id === notificationId ? { ...n, read_at: new Date().toISOString() } : n,
      ),
    );

    const db = await getDb();
    const existing = await db.get('notifications', notificationId);
    if (existing) {
      await db.put('notifications', { ...existing, read_at: new Date().toISOString() });
    }

    try {
      await apiClient(`/api/v1/travelers/me/notifications/${notificationId}/read`, {
        method: 'PATCH',
      });
    } catch {
      // Will sync later
    }
  };

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  if (loading) {
    return (
      <div className="notifications-page">
        <div className="notifications-header">
          <h1 className="notifications-title">Notifications</h1>
        </div>
        <SkeletonList count={4} />
      </div>
    );
  }

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <h1 className="notifications-title">Notifications</h1>
        {unreadCount > 0 && (
          <span className="notifications-badge" aria-label={`${unreadCount} unread notifications`}>
            {unreadCount}
          </span>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="notifications-empty">No notifications yet.</p>
      ) : (
        <ul className="notifications-list" aria-label="Notification list">
          {notifications.map((n) => (
            <li key={n.notification_id}>
              <button
                className={`notification-card${n.read_at ? '' : ' notification-unread'}`}
                onClick={() => !n.read_at && markAsRead(n.notification_id)}
                aria-label={`${n.read_at ? '' : 'Unread: '}${n.title}`}
              >
                <div className="notification-content">
                  <p className="notification-title">{n.title}</p>
                  <p className="notification-body">{n.body}</p>
                  <p className="notification-time">
                    {new Date(n.published_at).toLocaleString()}
                  </p>
                </div>
                {!n.read_at && <span className="notification-dot" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
