import { useState } from 'react';
import { apiClient } from '../lib/api';
import type { NotificationTarget } from '@wsb/shared/enums';

export default function AdminNotifications() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState<NotificationTarget>('all');
  const [targetId, setTargetId] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handlePublish() {
    if (!title.trim() || !body.trim()) {
      setError('Title and body are required');
      return;
    }
    if (targetType !== 'all' && !targetId.trim()) {
      setError('Target ID is required for non-broadcast notifications');
      return;
    }
    setSending(true);
    setError('');
    setSuccess(false);
    try {
      await apiClient('/api/v1/admin/notifications', {
        method: 'POST',
        body: JSON.stringify({
          title,
          body,
          target_type: targetType,
          target_id: targetType !== 'all' ? targetId : undefined,
        }),
      });
      setSuccess(true);
      setTitle('');
      setBody('');
      setTargetId('');
      setTargetType('all');
    } catch {
      setError('Failed to publish notification');
    } finally {
      setSending(false);
    }
  }

  const targets: NotificationTarget[] = ['all', 'group', 'hotel', 'bus', 'individual'];

  return (
    <div className="admin-page" data-testid="admin-notifications">
      <h1 className="admin-title">Publish Notification</h1>

      {error && <p className="admin-error" role="alert">{error}</p>}
      {success && <p className="admin-success" role="status">✅ Notification published</p>}

      <div className="admin-form-card">
        <label>
          Title
          <input
            className="admin-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Notification title"
            aria-label="Notification title"
          />
        </label>

        <label>
          Body
          <textarea
            className="admin-textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Notification body"
            rows={4}
            aria-label="Notification body"
          />
        </label>

        <label>
          Target Type
          <select
            className="admin-select"
            value={targetType}
            onChange={(e) => setTargetType(e.target.value as NotificationTarget)}
            aria-label="Target type"
          >
            {targets.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>

        {targetType !== 'all' && (
          <label>
            Target ID
            <input
              className="admin-input"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              placeholder={`${targetType} ID`}
              aria-label="Target ID"
            />
          </label>
        )}

        <button
          className="admin-btn admin-btn-primary"
          onClick={handlePublish}
          disabled={sending}
          data-testid="publish-btn"
        >
          {sending ? 'Publishing…' : '📢 Publish'}
        </button>
      </div>
    </div>
  );
}
