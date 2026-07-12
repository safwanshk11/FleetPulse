import { useEffect, useMemo, useState } from 'react';
import client from '../api/client';
import {
  Truck, CheckCircle2, Wrench, Route, Clock, UserCheck, Gauge,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight
} from 'lucide-react';

const STATUS_CLASS = {
  Draft: 'fp-row-draft',
  Dispatched: 'fp-row-dispatched',
  Completed: 'fp-row-completed',
  Cancelled: 'fp-row-cancelled'
};

const PAGE_SIZE = 5;

const COLUMNS = [
  { key: 'id', label: 'Trip' },
  { key: 'registration_number', label: 'Vehicle' },
  { key: 'driver_name', label: 'Driver' },
  { key: 'status', label: 'Status' },
  { key: 'eta_minutes', label: 'ETA' }
];

function formatEta(minutes) {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);

  useEffect(() => {
    client.get('/reports/dashboard').then((res) => setData(res.data));
  }, []);

  const sortedTrips = useMemo(() => {
    if (!data) return [];
    const trips = [...data.recentTrips];
    if (!sortKey) return trips;
    return trips.sort((a, b) => {
      let av = a[sortKey];
      let bv = b[sortKey];
      if (av === null || av === undefined) av = '';
      if (bv === null || bv === undefined) bv = '';
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedTrips.length / PAGE_SIZE));
  const paginatedTrips = sortedTrips.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  if (!data) return <p style={{ color: 'var(--text-secondary)' }}>Loading dashboard...</p>;

  const kpis = [
    ['Active vehicles', data.activeVehicles, null, Truck],
    ['Available vehicles', data.availableVehicles, 'Available', CheckCircle2],
    ['In maintenance', data.inMaintenance, 'In Shop', Wrench],
    ['Active trips', data.activeTrips, 'Dispatched', Route],
    ['Pending trips', data.pendingTrips, null, Clock],
    ['Drivers on duty', data.driversOnDuty, 'On Trip', UserCheck],
    ['Fleet utilization', `${data.fleetUtilization}%`, null, Gauge]
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>Dashboard</h2>

      <div className="fp-kpi-row">
        {kpis.map(([label, value, status, Icon]) => (
          <div key={label} className="fp-card fp-kpi-card" data-status={status || undefined}>
            <Icon className="fp-kpi-icon" size={18} strokeWidth={2} />
            <div>
              <div className="fp-kpi-label">{label}</div>
              <div className="fp-kpi-value">{value}</div>
            </div>
          </div>
        ))}
      </div>

      <h3 style={{ marginBottom: 12 }}>Recent trips</h3>
      <table className="fp-table">
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key)}
                className="fp-th-sortable"
              >
                <span className="fp-th-inner">
                  {col.label}
                  {sortKey === col.key && (
                    sortDir === 'asc'
                      ? <ChevronUp size={12} />
                      : <ChevronDown size={12} />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginatedTrips.map((t) => (
            <tr key={t.id} className={STATUS_CLASS[t.status] || ''}>
              <td className="fp-mono">TR{String(t.id).padStart(3, '0')}</td>
              <td className="fp-mono">{t.registration_number || '--'}</td>
              <td>{t.driver_name || '--'}</td>
              <td>
                <span className={`fp-badge fp-badge-${t.status.toLowerCase()}`}>{t.status}</span>
              </td>
              <td className="fp-mono">{formatEta(t.eta_minutes)}</td>
            </tr>
          ))}
          {sortedTrips.length === 0 && (
            <tr><td colSpan={5} style={{ color: 'var(--text-muted)' }}>No trips yet</td></tr>
          )}
        </tbody>
      </table>

      {sortedTrips.length > PAGE_SIZE && (
        <div className="fp-pagination">
          <button
            type="button"
            className="fp-btn fp-btn-ghost"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft size={14} />
          </button>
          <span className="fp-pagination-label">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="fp-btn fp-btn-ghost"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}