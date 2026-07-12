// Settings.jsx — owner: Person A (Fleet & Assets)
// RBAC is enforced server-side in every route file via requireRole() —
// this page is a reference display, not a config editor, since the roles
// and permissions are fixed by the problem statement rather than admin-defined.

import { useAuth } from '../api/AuthContext';

const ROLES = ['FleetManager', 'Dispatcher', 'SafetyOfficer', 'FinancialAnalyst'];

const ROLE_LABELS = {
  FleetManager: 'Fleet Manager',
  Dispatcher: 'Dispatcher',
  SafetyOfficer: 'Safety Officer',
  FinancialAnalyst: 'Financial Analyst'
};

// access levels: 'edit' | 'view' | '-'
const MATRIX = [
  { module: 'Dashboard', FleetManager: 'view', Dispatcher: 'view', SafetyOfficer: 'view', FinancialAnalyst: 'view' },
  { module: 'Fleet (Vehicles)', FleetManager: 'edit', Dispatcher: 'view', SafetyOfficer: '-', FinancialAnalyst: '-' },
  { module: 'Drivers', FleetManager: 'edit', Dispatcher: 'view', SafetyOfficer: 'edit', FinancialAnalyst: '-' },
  { module: 'Trips', FleetManager: 'edit', Dispatcher: 'edit', SafetyOfficer: 'view', FinancialAnalyst: '-' },
  { module: 'Maintenance', FleetManager: 'edit', Dispatcher: '-', SafetyOfficer: '-', FinancialAnalyst: '-' },
  { module: 'Fuel & Expenses', FleetManager: 'edit', Dispatcher: 'edit', SafetyOfficer: '-', FinancialAnalyst: 'edit' },
  { module: 'Analytics', FleetManager: 'view', Dispatcher: '-', SafetyOfficer: '-', FinancialAnalyst: 'view' }
];

function AccessCell({ level }) {
  const style = {
    edit: { color: 'var(--status-available)', label: 'Edit' },
    view: { color: 'var(--text-secondary)', label: 'View' },
    '-': { color: 'var(--text-muted)', label: '\u2014' }
  }[level];
  return <span className="fp-mono" style={{ fontSize: 11.5, color: style.color }}>{style.label}</span>;
}

export default function Settings() {
  const { user } = useAuth();

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>Settings & RBAC</h2>

      <h3 style={{ marginBottom: 12 }}>General</h3>
      <div className="fp-card" style={{ marginBottom: 32, maxWidth: 420 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div className="fp-kpi-label">Depot name</div>
            <div style={{ marginTop: 4 }}>Gandhinagar Depot</div>
          </div>
          <div>
            <div className="fp-kpi-label">Currency</div>
            <div style={{ marginTop: 4 }} className="fp-mono">INR (Rs.)</div>
          </div>
          <div>
            <div className="fp-kpi-label">Distance unit</div>
            <div style={{ marginTop: 4 }} className="fp-mono">Kilometers</div>
          </div>
        </div>
      </div>

      <h3 style={{ marginBottom: 4 }}>Role-based access (RBAC)</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: 12.5, marginBottom: 12 }}>
        Enforced server-side on every request &mdash; this table mirrors the checks in each backend route.
      </p>

      <table className="fp-table">
        <thead>
          <tr>
            <th>Module</th>
            {ROLES.map((r) => (
              <th key={r} style={{ color: user?.role === r ? 'var(--accent-strong)' : undefined }}>
                {ROLE_LABELS[r]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MATRIX.map((row) => (
            <tr key={row.module}>
              <td>{row.module}</td>
              {ROLES.map((r) => (
                <td key={r}><AccessCell level={row[r]} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <p className="fp-rule">
        You are signed in as <strong style={{ color: 'var(--text-primary)' }}>{user?.name}</strong> ({ROLE_LABELS[user?.role] || user?.role})
      </p>
    </div>
  );
}