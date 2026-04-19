import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../lib/api';

interface Group {
  group_id: string;
  name: string;
  description: string | null;
  traveler_count?: number;
}

interface AssignmentSummary {
  groups: { group_id: string; name: string; count: number }[];
  hotels: { hotel_id: string; name: string; count: number }[];
  buses: { bus_id: string; bus_number: string; count: number }[];
}

interface GroupForm {
  name: string;
  description: string;
}

const emptyForm: GroupForm = { name: '', description: '' };

export default function AdminGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [summary, setSummary] = useState<AssignmentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<GroupForm>(emptyForm);

  // Assignment
  const [assignTravelerId, setAssignTravelerId] = useState('');
  const [assignType, setAssignType] = useState<'group' | 'hotel' | 'bus' | 'option'>('group');
  const [assignTargetId, setAssignTargetId] = useState('');

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [groupsRes, summaryRes] = await Promise.allSettled([
        apiClient<{ groups: Group[] }>('/api/v1/admin/groups'),
        apiClient<AssignmentSummary>('/api/v1/admin/assignments/summary'),
      ]);
      if (groupsRes.status === 'fulfilled') setGroups(groupsRes.value.groups ?? []);
      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value);
    } catch {
      setError('Failed to load groups');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  async function handleSave() {
    try {
      if (editId) {
        await apiClient(`/api/v1/admin/groups/${editId}`, { method: 'PATCH', body: JSON.stringify(form) });
      } else {
        await apiClient('/api/v1/admin/groups', { method: 'POST', body: JSON.stringify(form) });
      }
      setShowForm(false);
      setEditId(null);
      setForm(emptyForm);
      loadGroups();
    } catch {
      setError('Failed to save group');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this group?')) return;
    try {
      await apiClient(`/api/v1/admin/groups/${id}`, { method: 'DELETE' });
      loadGroups();
    } catch {
      setError('Failed to delete group');
    }
  }

  async function handleAssign() {
    if (!assignTravelerId || !assignTargetId) return;
    try {
      const endpoint = assignType === 'option'
        ? `/api/v1/admin/travelers/${assignTravelerId}/assign-option`
        : `/api/v1/admin/travelers/${assignTravelerId}/assign-${assignType}`;
      await apiClient(endpoint, { method: 'POST', body: JSON.stringify({ [`${assignType}_id`]: assignTargetId }) });
      setAssignTravelerId('');
      setAssignTargetId('');
      loadGroups();
    } catch {
      setError('Assignment failed');
    }
  }

  return (
    <div className="admin-page" data-testid="admin-groups">
      <h1 className="admin-title">Group & Assignment Management</h1>

      <div className="admin-toolbar">
        <button className="admin-btn admin-btn-primary" onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }}>+ Add Group</button>
      </div>

      {error && <p className="admin-error" role="alert">{error}</p>}

      {/* CRUD Form */}
      {showForm && (
        <div className="admin-form-overlay" data-testid="group-form">
          <div className="admin-form-card">
            <h2>{editId ? 'Edit Group' : 'Add Group'}</h2>
            <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label>Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <div className="admin-form-actions">
              <button className="admin-btn admin-btn-primary" onClick={handleSave}>Save</button>
              <button className="admin-btn" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Groups Table */}
      {loading ? (
        <p role="status">Loading…</p>
      ) : (
        <table className="admin-table" aria-label="Groups table">
          <thead>
            <tr><th>Name</th><th>Description</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.group_id}>
                <td>{g.name}</td>
                <td>{g.description ?? '—'}</td>
                <td>
                  <button className="admin-btn-sm" onClick={() => { setForm({ name: g.name, description: g.description ?? '' }); setEditId(g.group_id); setShowForm(true); }} aria-label={`Edit ${g.name}`}>Edit</button>
                  <button className="admin-btn-sm admin-btn-danger" onClick={() => handleDelete(g.group_id)} aria-label={`Delete ${g.name}`}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Assignment Section */}
      <section className="admin-assign-section" aria-label="Assign travelers">
        <h2 className="admin-section-title">Assign Traveler</h2>
        <div className="admin-assign-form">
          <input placeholder="Traveler ID" value={assignTravelerId} onChange={(e) => setAssignTravelerId(e.target.value)} aria-label="Traveler ID" />
          <select value={assignType} onChange={(e) => setAssignType(e.target.value as typeof assignType)} aria-label="Assignment type">
            <option value="group">Group</option>
            <option value="hotel">Hotel</option>
            <option value="bus">Bus</option>
            <option value="option">Itinerary Option</option>
          </select>
          <input placeholder={`${assignType} ID`} value={assignTargetId} onChange={(e) => setAssignTargetId(e.target.value)} aria-label="Target ID" />
          <button className="admin-btn admin-btn-primary" onClick={handleAssign}>Assign</button>
        </div>
      </section>

      {/* Summary View */}
      {summary && (
        <section className="admin-summary-section" aria-label="Assignment summary">
          <h2 className="admin-section-title">Assignment Summary</h2>
          <div className="admin-summary-grid">
            <div>
              <h3>Groups</h3>
              <ul>{summary.groups.map((g) => <li key={g.group_id}>{g.name}: {g.count}</li>)}</ul>
            </div>
            <div>
              <h3>Hotels</h3>
              <ul>{summary.hotels.map((h) => <li key={h.hotel_id}>{h.name}: {h.count}</li>)}</ul>
            </div>
            <div>
              <h3>Buses</h3>
              <ul>{summary.buses.map((b) => <li key={b.bus_id}>{b.bus_number}: {b.count}</li>)}</ul>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
