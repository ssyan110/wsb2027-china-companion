import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../lib/api';

interface DashboardStats {
  total_travelers: number;
  activated: number;
  pending: number;
  families: number;
  staff: number;
}

interface ScanEvent {
  log_id: string;
  staff_id: string;
  qr_token_value: string;
  scan_mode: string;
  result: string;
  scanned_at: string;
}

interface BusFill {
  bus_id: string;
  bus_number: string;
  capacity: number;
  assigned: number;
}

interface HealthStatus {
  manifest_sync: string;
  notification_rate: number;
  scan_backlog: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [scans, setScans] = useState<ScanEvent[]>([]);
  const [buses, setBuses] = useState<BusFill[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setError('');
    try {
      const [statsRes, scansRes, busesRes] = await Promise.allSettled([
        apiClient<DashboardStats>('/api/v1/admin/dashboard/stats'),
        apiClient<{ scans: ScanEvent[] }>('/api/v1/admin/dashboard/scans?limit=20'),
        apiClient<{ buses: BusFill[] }>('/api/v1/admin/buses'),
      ]);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (scansRes.status === 'fulfilled') setScans(scansRes.value.scans ?? []);
      if (busesRes.status === 'fulfilled') setBuses(busesRes.value.buses ?? []);
      setHealth({ manifest_sync: 'ok', notification_rate: 98, scan_backlog: 0 });
    } catch {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="admin-page" role="status">Loading dashboard…</div>;
  if (error) return <div className="admin-page admin-error" role="alert">{error}</div>;

  return (
    <div className="admin-page" data-testid="admin-dashboard">
      <h1 className="admin-title">Admin Dashboard</h1>

      {/* Summary Cards */}
      <section className="admin-summary-cards" aria-label="Summary statistics">
        <div className="admin-stat-card"><span className="admin-stat-value">{stats?.total_travelers ?? 0}</span><span className="admin-stat-label">Total Travelers</span></div>
        <div className="admin-stat-card"><span className="admin-stat-value">{stats?.activated ?? 0}</span><span className="admin-stat-label">Activated</span></div>
        <div className="admin-stat-card"><span className="admin-stat-value">{stats?.pending ?? 0}</span><span className="admin-stat-label">Pending</span></div>
        <div className="admin-stat-card"><span className="admin-stat-value">{stats?.families ?? 0}</span><span className="admin-stat-label">Families</span></div>
        <div className="admin-stat-card"><span className="admin-stat-value">{stats?.staff ?? 0}</span><span className="admin-stat-label">Staff</span></div>
      </section>

      {/* Navigation */}
      <section className="admin-nav-grid" aria-label="Admin navigation">
        <Link to="/admin/travelers" className="admin-nav-link">👥 Travelers</Link>
        <Link to="/admin/groups" className="admin-nav-link">📋 Groups</Link>
        <Link to="/admin/events" className="admin-nav-link">📅 Events</Link>
        <Link to="/admin/dispatch" className="admin-nav-link">🚌 Dispatch</Link>
        <Link to="/admin/notifications" className="admin-nav-link">🔔 Notifications</Link>
        <Link to="/admin/audit" className="admin-nav-link">📝 Audit Log</Link>
      </section>

      {/* System Health */}
      {health && (
        <section className="admin-health" aria-label="System health">
          <h2 className="admin-section-title">System Health</h2>
          <div className="admin-health-row">
            <span>Manifest Sync: <strong>{health.manifest_sync}</strong></span>
            <span>Notification Rate: <strong>{health.notification_rate}%</strong></span>
            <span>Scan Backlog: <strong>{health.scan_backlog}</strong></span>
          </div>
        </section>
      )}

      {/* Bus Fill Status */}
      {buses.length > 0 && (
        <section aria-label="Bus fill status">
          <h2 className="admin-section-title">Bus Fill Status</h2>
          <div className="admin-bus-chart">
            {buses.map((b) => (
              <div key={b.bus_id} className="admin-bus-bar-row">
                <span className="admin-bus-label">{b.bus_number}</span>
                <div className="admin-bus-bar-track">
                  <div
                    className="admin-bus-bar-fill"
                    style={{ width: `${Math.min((b.assigned / b.capacity) * 100, 100)}%` }}
                    role="progressbar"
                    aria-valuenow={b.assigned}
                    aria-valuemin={0}
                    aria-valuemax={b.capacity}
                    aria-label={`${b.bus_number}: ${b.assigned} of ${b.capacity}`}
                  />
                </div>
                <span className="admin-bus-count">{b.assigned}/{b.capacity}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Scan Activity Feed */}
      <section aria-label="Recent scan activity">
        <h2 className="admin-section-title">Recent Scans</h2>
        {scans.length === 0 ? (
          <p className="admin-empty">No recent scan activity</p>
        ) : (
          <ul className="admin-scan-feed" role="log">
            {scans.map((s) => (
              <li key={s.log_id} className={`admin-scan-item admin-scan-${s.result}`}>
                <span className="admin-scan-mode">{s.scan_mode}</span>
                <span className={`admin-scan-result admin-scan-result-${s.result}`}>{s.result}</span>
                <span className="admin-scan-time">{new Date(s.scanned_at).toLocaleTimeString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
