export function OpsAuditLog() {
  return (
    <div data-testid="ops-audit-log-page" style={{ padding: '1.5rem' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Audit Log</h1>
      <p style={{ color: '#666' }}>
        Audit log viewer showing all data mutations made through the admin panel,
        including field updates, check-in changes, and CSV exports.
      </p>
    </div>
  );
}

export default OpsAuditLog;
