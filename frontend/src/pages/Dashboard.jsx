import { useEffect, useState } from 'react';
import client from '../api/client';

const STATUS_CLASS = {
  Draft: 'fp-row-draft',
  Dispatched: 'fp-row-dispatched',
  Completed: 'fp-row-completed',
  Cancelled: 'fp-row-cancelled'
};

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    client.get('/reports/dashboard').then((res) => setData(res.data));
  }, []);

  if (!data) return <p style={{ color: 'var(--text-secondary)' }}>Loading dashboard...</p>;

  const kpis = [
    ['Active vehicles', data.activeVehicles, null],
    ['Available vehicles', data.availableVehicles, 'Available'],
    ['In maintenance', data.inMaintenance, 'In Shop'],
    ['Active trips', data.activeTrips, 'Dispatched'],
    ['Pending trips', data.pendingTrips, null],
    ['Drivers on duty', data.driversOnDuty, 'On Trip'],
    ['Fleet utilization', `${data.fleetUtilization}%`, null]
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>Dashboard</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 36 }}>
        {kpis.map(([label, value, status]) => (
          <div key={label} className="fp-card" data-status={status || undefined}>
            <div className="fp-kpi-label">{label}</div>
            <div className="fp-kpi-value">{value}</div>
          </div>
        ))}
      </div>

      <h3 style={{ marginBottom: 12 }}>Recent trips</h3>
      <table className="fp-table">
        <thead>
          <tr>
            <th>Trip</th>
            <th>Vehicle</th>
            <th>Driver</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {data.recentTrips.map((t) => (
            <tr key={t.id} className={STATUS_CLASS[t.status] || ''}>
              <td className="fp-mono">TR{String(t.id).padStart(3, '0')}</td>
              <td className="fp-mono">{t.registration_number || '--'}</td>
              <td>{t.driver_name || '--'}</td>
              <td>
                <span className={`fp-badge fp-badge-${t.status.toLowerCase()}`}>{t.status}</span>
              </td>
            </tr>
          ))}
          {data.recentTrips.length === 0 && (
            <tr><td colSpan={4} style={{ color: 'var(--text-muted)' }}>No trips yet</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
