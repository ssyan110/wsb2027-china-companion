import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../lib/api';
import type { ImportResponse, ImportError } from '@wsb/shared/api-types';
import type { RoleType, AccessStatus } from '@wsb/shared/enums';

interface Traveler {
  traveler_id: string;
  full_name: string;
  email: string;
  role_type: RoleType;
  access_status: AccessStatus;
  family_id: string | null;
  booking_id?: string;
}

interface TravelerForm {
  full_name: string;
  email: string;
  role_type: RoleType;
  booking_id: string;
}

const emptyForm: TravelerForm = { full_name: '', email: '', role_type: 'traveler', booking_id: '' };

export default function AdminTravelers() {
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // CRUD
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<TravelerForm>(emptyForm);

  // CSV Import
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResponse | null>(null);

  // Family linking
  const [familyTravelerId, setFamilyTravelerId] = useState('');
  const [familyAction, setFamilyAction] = useState<'create' | 'link' | null>(null);
  const [familyId, setFamilyId] = useState('');

  const loadTravelers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (filterRole) params.set('role_type', filterRole);
      const res = await apiClient<{ travelers: Traveler[] }>(`/api/v1/admin/travelers?${params}`);
      setTravelers(res.travelers ?? []);
    } catch {
      setError('Failed to load travelers');
    } finally {
      setLoading(false);
    }
  }, [search, filterRole]);

  useEffect(() => { loadTravelers(); }, [loadTravelers]);

  async function handleSave() {
    try {
      if (editId) {
        await apiClient(`/api/v1/admin/travelers/${editId}`, { method: 'PATCH', body: JSON.stringify(form) });
      } else {
        await apiClient('/api/v1/admin/travelers', { method: 'POST', body: JSON.stringify(form) });
      }
      setShowForm(false);
      setEditId(null);
      setForm(emptyForm);
      loadTravelers();
    } catch {
      setError('Failed to save traveler');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Deactivate this traveler?')) return;
    try {
      await apiClient(`/api/v1/admin/travelers/${id}`, { method: 'DELETE' });
      loadTravelers();
    } catch {
      setError('Failed to deactivate traveler');
    }
  }

  function startEdit(t: Traveler) {
    setForm({ full_name: t.full_name, email: t.email, role_type: t.role_type, booking_id: t.booking_id ?? '' });
    setEditId(t.traveler_id);
    setShowForm(true);
  }

  async function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient<ImportResponse>('/api/v1/admin/import/travelers', {
        method: 'POST',
        headers: {},
        body: formData,
      });
      setImportResult(res);
      loadTravelers();
    } catch {
      setError('CSV import failed');
    } finally {
      setImporting(false);
    }
  }

  async function handleFamilyAction() {
    if (!familyTravelerId) return;
    try {
      if (familyAction === 'create') {
        await apiClient('/api/v1/admin/families', { method: 'POST', body: JSON.stringify({ representative_id: familyTravelerId }) });
      } else if (familyAction === 'link' && familyId) {
        await apiClient(`/api/v1/admin/families/${familyId}/members`, { method: 'POST', body: JSON.stringify({ traveler_id: familyTravelerId }) });
      }
      setFamilyAction(null);
      setFamilyTravelerId('');
      setFamilyId('');
      loadTravelers();
    } catch {
      setError('Family operation failed');
    }
  }

  return (
    <div className="admin-page" data-testid="admin-travelers">
      <h1 className="admin-title">Traveler Management</h1>

      {/* Search & Filter */}
      <div className="admin-toolbar">
        <input
          className="admin-search"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search travelers"
        />
        <select className="admin-filter" value={filterRole} onChange={(e) => setFilterRole(e.target.value)} aria-label="Filter by role">
          <option value="">All Roles</option>
          <option value="traveler">Traveler</option>
          <option value="minor">Minor</option>
          <option value="representative">Representative</option>
          <option value="staff">Staff</option>
        </select>
        <button className="admin-btn admin-btn-primary" onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }}>+ Add Traveler</button>
      </div>

      {/* CSV Import */}
      <div className="admin-import-section">
        <label className="admin-btn admin-btn-secondary" htmlFor="csv-upload">
          {importing ? 'Importing…' : '📁 Import CSV'}
        </label>
        <input id="csv-upload" type="file" accept=".csv" onChange={handleCsvImport} hidden disabled={importing} />
        {importResult && (
          <div className="admin-import-result" data-testid="import-result">
            <p>Imported: {importResult.imported}</p>
            {importResult.errors.length > 0 && (
              <details>
                <summary>{importResult.errors.length} error(s)</summary>
                <ul className="admin-import-errors">
                  {importResult.errors.map((err: ImportError, i: number) => (
                    <li key={i}>Row {err.row}: {err.field} — {err.reason}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>

      {/* Family Linking */}
      <details className="admin-family-section">
        <summary>Family Linking</summary>
        <div className="admin-family-form">
          <input placeholder="Traveler ID" value={familyTravelerId} onChange={(e) => setFamilyTravelerId(e.target.value)} aria-label="Traveler ID for family" />
          <button className="admin-btn" onClick={() => setFamilyAction('create')}>Create Family</button>
          <input placeholder="Family ID (to link)" value={familyId} onChange={(e) => setFamilyId(e.target.value)} aria-label="Family ID" />
          <button className="admin-btn" onClick={() => setFamilyAction('link')}>Link to Family</button>
          {familyAction && <button className="admin-btn admin-btn-primary" onClick={handleFamilyAction}>Confirm {familyAction}</button>}
        </div>
      </details>

      {error && <p className="admin-error" role="alert">{error}</p>}

      {/* CRUD Form */}
      {showForm && (
        <div className="admin-form-overlay" data-testid="traveler-form">
          <div className="admin-form-card">
            <h2>{editId ? 'Edit Traveler' : 'Add Traveler'}</h2>
            <label>Name<input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></label>
            <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
            <label>Booking ID<input value={form.booking_id} onChange={(e) => setForm({ ...form, booking_id: e.target.value })} /></label>
            <label>Role
              <select value={form.role_type} onChange={(e) => setForm({ ...form, role_type: e.target.value as RoleType })}>
                <option value="traveler">Traveler</option>
                <option value="minor">Minor</option>
                <option value="representative">Representative</option>
                <option value="staff">Staff</option>
              </select>
            </label>
            <div className="admin-form-actions">
              <button className="admin-btn admin-btn-primary" onClick={handleSave}>Save</button>
              <button className="admin-btn" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <p role="status">Loading…</p>
      ) : (
        <table className="admin-table" aria-label="Travelers table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Family</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {travelers.map((t) => (
              <tr key={t.traveler_id}>
                <td>{t.full_name}</td>
                <td>{t.email}</td>
                <td>{t.role_type}</td>
                <td>{t.access_status}</td>
                <td>{t.family_id ?? '—'}</td>
                <td>
                  <button className="admin-btn-sm" onClick={() => startEdit(t)} aria-label={`Edit ${t.full_name}`}>Edit</button>
                  <button className="admin-btn-sm admin-btn-danger" onClick={() => handleDelete(t.traveler_id)} aria-label={`Delete ${t.full_name}`}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
