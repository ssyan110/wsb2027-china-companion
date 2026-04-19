import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../lib/api';
import type { EventType } from '@wsb/shared/enums';

interface EventRecord {
  event_id: string;
  name: string;
  event_type: EventType;
  date: string;
  start_time: string;
  end_time: string | null;
  location: string;
  description: string | null;
}

interface EligibilityRule {
  group_id?: string;
  hotel_id?: string;
  option_id?: string;
}

interface EventForm {
  name: string;
  event_type: EventType;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  description: string;
  eligibility: EligibilityRule[];
}

const emptyForm: EventForm = {
  name: '', event_type: 'activity', date: '', start_time: '', end_time: '',
  location: '', description: '', eligibility: [],
};

export default function AdminEvents() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<EventForm>(emptyForm);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient<{ events: EventRecord[] }>('/api/v1/admin/events');
      setEvents(res.events ?? []);
    } catch {
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  async function handleSave() {
    try {
      const body = { ...form, end_time: form.end_time || null };
      if (editId) {
        await apiClient(`/api/v1/admin/events/${editId}`, { method: 'PATCH', body: JSON.stringify(body) });
      } else {
        await apiClient('/api/v1/admin/events', { method: 'POST', body: JSON.stringify(body) });
      }
      setShowForm(false);
      setEditId(null);
      setForm(emptyForm);
      loadEvents();
    } catch {
      setError('Failed to save event');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this event?')) return;
    try {
      await apiClient(`/api/v1/admin/events/${id}`, { method: 'DELETE' });
      loadEvents();
    } catch {
      setError('Failed to delete event');
    }
  }

  function startEdit(ev: EventRecord) {
    setForm({
      name: ev.name, event_type: ev.event_type, date: ev.date,
      start_time: ev.start_time, end_time: ev.end_time ?? '',
      location: ev.location, description: ev.description ?? '', eligibility: [],
    });
    setEditId(ev.event_id);
    setShowForm(true);
  }

  function addRule() {
    setForm({ ...form, eligibility: [...form.eligibility, {}] });
  }

  function updateRule(idx: number, field: string, value: string) {
    const rules = [...form.eligibility];
    rules[idx] = { ...rules[idx], [field]: value || undefined };
    setForm({ ...form, eligibility: rules });
  }

  function removeRule(idx: number) {
    setForm({ ...form, eligibility: form.eligibility.filter((_, i) => i !== idx) });
  }

  const eventTypes: EventType[] = ['bus', 'meal', 'activity', 'ceremony', 'transfer', 'hotel_checkin'];

  return (
    <div className="admin-page" data-testid="admin-events">
      <h1 className="admin-title">Event Management</h1>

      <div className="admin-toolbar">
        <button className="admin-btn admin-btn-primary" onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }}>+ Add Event</button>
      </div>

      {error && <p className="admin-error" role="alert">{error}</p>}

      {showForm && (
        <div className="admin-form-overlay" data-testid="event-form">
          <div className="admin-form-card">
            <h2>{editId ? 'Edit Event' : 'Add Event'}</h2>
            <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label>Type
              <select value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value as EventType })}>
                {eventTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label>Date<input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
            <label>Start Time<input type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></label>
            <label>End Time<input type="datetime-local" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></label>
            <label>Location<input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label>
            <label>Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>

            <fieldset className="admin-eligibility">
              <legend>Eligibility Rules</legend>
              {form.eligibility.map((rule, idx) => (
                <div key={idx} className="admin-eligibility-rule">
                  <input placeholder="Group ID" value={rule.group_id ?? ''} onChange={(e) => updateRule(idx, 'group_id', e.target.value)} aria-label="Group ID" />
                  <input placeholder="Hotel ID" value={rule.hotel_id ?? ''} onChange={(e) => updateRule(idx, 'hotel_id', e.target.value)} aria-label="Hotel ID" />
                  <input placeholder="Option ID" value={rule.option_id ?? ''} onChange={(e) => updateRule(idx, 'option_id', e.target.value)} aria-label="Option ID" />
                  <button className="admin-btn-sm admin-btn-danger" onClick={() => removeRule(idx)} aria-label="Remove rule">✕</button>
                </div>
              ))}
              <button className="admin-btn" onClick={addRule}>+ Add Rule</button>
            </fieldset>

            <div className="admin-form-actions">
              <button className="admin-btn admin-btn-primary" onClick={handleSave}>Save</button>
              <button className="admin-btn" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p role="status">Loading…</p>
      ) : (
        <table className="admin-table" aria-label="Events table">
          <thead>
            <tr><th>Name</th><th>Type</th><th>Date</th><th>Location</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {events.map((ev) => (
              <tr key={ev.event_id}>
                <td>{ev.name}</td>
                <td>{ev.event_type}</td>
                <td>{ev.date}</td>
                <td>{ev.location}</td>
                <td>
                  <button className="admin-btn-sm" onClick={() => startEdit(ev)} aria-label={`Edit ${ev.name}`}>Edit</button>
                  <button className="admin-btn-sm admin-btn-danger" onClick={() => handleDelete(ev.event_id)} aria-label={`Delete ${ev.name}`}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
