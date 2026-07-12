import { useEffect, useState, useMemo } from 'react';
import api from '../api/client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

// Map our own good/warn/bad concept onto the real status keys styles.css understands
const STATUS_KEY = { good: 'Available', warn: 'In Shop', bad: 'Retired' };
const STATUS_COLOR = {
  good: 'var(--status-available)',
  warn: 'var(--status-inshop)',
  bad: 'var(--status-retired)'
};

function roiStatus(roi) {
  if (roi > 0) return 'good';
  if (roi === 0) return 'warn';
  return 'bad';
}

function effStatus(eff) {
  if (eff >= 8) return 'good';
  if (eff >= 4) return 'warn';
  return 'bad';
}

function utilStatus(pct) {
  if (pct >= 70) return 'good';
  if (pct >= 40) return 'warn';
  return 'bad';
}

function downloadCsv(rows) {
  const headers = ['Vehicle', 'Fuel Efficiency (km/L)', 'Operational Cost', 'ROI (%)'];
  const lines = rows.map(r => [
    r.registration_number,
    r.fuelEfficiency,
    r.operationalCost,
    r.roi
  ].join(','));
  const csv = [headers.join(','), ...lines].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `fleetpulse-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function Analytics() {
  const [rows, setRows] = useState([]);
  const [fleetUtilization, setFleetUtilization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState('operationalCost');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.get('/reports/analytics'),
      api.get('/reports/dashboard')
    ])
      .then(([analyticsRes, dashboardRes]) => {
        if (cancelled) return;
        setRows(analyticsRes.data);
        setFleetUtilization(dashboardRes.data.fleetUtilization);
      })
      .catch(err => { if (!cancelled) setError(err.response?.data?.error || 'Failed to load analytics'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey];
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === 'asc' ? va - vb : vb - va;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  }

  const totals = useMemo(() => ({
    totalOperationalCost: rows.reduce((s, r) => s + r.operationalCost, 0),
    avgFuelEfficiency: rows.length ? (rows.reduce((s, r) => s + r.fuelEfficiency, 0) / rows.length).toFixed(1) : 0,
    avgRoi: rows.length ? (rows.reduce((s, r) => s + r.roi, 0) / rows.length).toFixed(1) : 0
  }), [rows]);

  if (loading) return <div>Loading analytics…</div>;
  if (error) return <div className="fp-card" data-status="Retired"><span className="fp-error">{error}</span></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h2>Reports & Analytics</h2>
        <button className="fp-btn fp-btn-primary" onClick={() => downloadCsv(sorted)}>
          Export CSV
        </button>
      </div>

      <div className="fp-kpi-row">
        <div className="fp-card fp-kpi-card" data-status={STATUS_KEY[effStatus(Number(totals.avgFuelEfficiency))]}>
          <div>
            <div className="fp-kpi-label">Avg Fuel Efficiency</div>
            <div className="fp-kpi-value">{totals.avgFuelEfficiency} km/L</div>
          </div>
        </div>
        <div className="fp-card fp-kpi-card" data-status={STATUS_KEY[utilStatus(fleetUtilization ?? 0)]}>
          <div>
            <div className="fp-kpi-label">Fleet Utilization</div>
            <div className="fp-kpi-value">{fleetUtilization ?? 0}%</div>
          </div>
        </div>
        <div className="fp-card fp-kpi-card" data-status="In Shop">
          <div>
            <div className="fp-kpi-label">Total Operational Cost</div>
            <div className="fp-kpi-value">₹{totals.totalOperationalCost.toLocaleString('en-IN')}</div>
          </div>
        </div>
        <div className="fp-card fp-kpi-card" data-status={STATUS_KEY[roiStatus(Number(totals.avgRoi))]}>
          <div>
            <div className="fp-kpi-label">Avg ROI</div>
            <div className="fp-kpi-value">{totals.avgRoi}%</div>
          </div>
        </div>
      </div>

      <p className="fp-rule">
        ROI = (Revenue − (Maintenance + Fuel)) / Acquisition Cost. Revenue isn't tracked yet, so ROI currently reflects cost only.
      </p>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', margin: '20px 0 24px' }}>
        <div className="fp-card" style={{ flex: '1 1 400px', minWidth: 320, height: 300 }}>
          <h3>Fuel Efficiency by Vehicle (km/L)</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} stroke="var(--border-strong)" />
              <XAxis dataKey="registration_number" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
              <YAxis tick={{ fill: 'var(--text-secondary)' }} />
              <Tooltip contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }} />
              <Bar dataKey="fuelEfficiency" radius={[4, 4, 0, 0]}>
                {rows.map((r, i) => (
                  <Cell key={i} fill={STATUS_COLOR[effStatus(r.fuelEfficiency)]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="fp-card" style={{ flex: '1 1 400px', minWidth: 320, height: 300 }}>
          <h3>ROI by Vehicle (%)</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} stroke="var(--border-strong)" />
              <XAxis dataKey="registration_number" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
              <YAxis tick={{ fill: 'var(--text-secondary)' }} />
              <Tooltip contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }} />
              <Bar dataKey="roi" radius={[4, 4, 0, 0]}>
                {rows.map((r, i) => (
                  <Cell key={i} fill={STATUS_COLOR[roiStatus(r.roi)]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <table className="fp-table">
        <thead>
          <tr>
            <th className="fp-th-sortable" onClick={() => toggleSort('registration_number')}>
              <span className="fp-th-inner">Vehicle {sortKey === 'registration_number' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</span>
            </th>
            <th className="fp-th-sortable" onClick={() => toggleSort('fuelEfficiency')}>
              <span className="fp-th-inner">Fuel Efficiency (km/L) {sortKey === 'fuelEfficiency' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</span>
            </th>
            <th className="fp-th-sortable" onClick={() => toggleSort('operationalCost')}>
              <span className="fp-th-inner">Operational Cost {sortKey === 'operationalCost' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</span>
            </th>
            <th className="fp-th-sortable" onClick={() => toggleSort('roi')}>
              <span className="fp-th-inner">ROI (%) {sortKey === 'roi' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(r => (
            <tr key={r.vehicle_id} className={`fp-row-${STATUS_KEY[effStatus(r.fuelEfficiency)].toLowerCase().replace(' ', '')}`}>
              <td className="fp-mono">{r.registration_number}</td>
              <td>
                <span className={`fp-badge fp-badge-${effStatus(r.fuelEfficiency) === 'good' ? 'available' : effStatus(r.fuelEfficiency) === 'warn' ? 'inshop' : 'retired'}`}>
                  {r.fuelEfficiency}
                </span>
              </td>
              <td>₹{r.operationalCost.toLocaleString('en-IN')}</td>
              <td>
                <span className={`fp-badge fp-badge-${roiStatus(r.roi) === 'good' ? 'available' : roiStatus(r.roi) === 'warn' ? 'inshop' : 'retired'}`}>
                  {r.roi}%
                </span>
              </td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No vehicle data yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
