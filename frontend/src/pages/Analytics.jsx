import { useEffect, useState, useMemo } from 'react';
import api from '../api/client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const STATUS_COLORS = {
  good: 'var(--status-good, #22c55e)',
  warn: 'var(--status-warn, #f59e0b)',
  bad: 'var(--status-bad, #ef4444)'
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

export default function Analytics() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState('operationalCost');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get('/reports/analytics')
      .then(res => { if (!cancelled) setRows(res.data); })
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
  if (error) return <div className="fp-card" data-status="bad">{error}</div>;

  return (
    <div>
      <h2>Reports & Analytics</h2>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', margin: '16px 0' }}>
        <div className="fp-card" data-status="warn">
          <div>Total Operational Cost</div>
          <strong>₹{totals.totalOperationalCost.toLocaleString('en-IN')}</strong>
        </div>
        <div className="fp-card" data-status={effStatus(Number(totals.avgFuelEfficiency))}>
          <div>Avg Fuel Efficiency</div>
          <strong>{totals.avgFuelEfficiency} km/L</strong>
        </div>
        <div className="fp-card" data-status={roiStatus(Number(totals.avgRoi))}>
          <div>Avg ROI</div>
          <strong>{totals.avgRoi}%</strong>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <div className="fp-card" style={{ flex: '1 1 400px', minWidth: 320, height: 300 }}>
          <h4>Fuel Efficiency by Vehicle (km/L)</h4>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="registration_number" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="fuelEfficiency" radius={[4, 4, 0, 0]}>
                {rows.map((r, i) => (
                  <Cell key={i} fill={STATUS_COLORS[effStatus(r.fuelEfficiency)]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="fp-card" style={{ flex: '1 1 400px', minWidth: 320, height: 300 }}>
          <h4>ROI by Vehicle (%)</h4>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="registration_number" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="roi" radius={[4, 4, 0, 0]}>
                {rows.map((r, i) => (
                  <Cell key={i} fill={STATUS_COLORS[roiStatus(r.roi)]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <table className="fp-table">
        <thead>
          <tr>
            <th onClick={() => toggleSort('registration_number')} style={{ cursor: 'pointer' }}>Vehicle {sortKey === 'registration_number' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
            <th onClick={() => toggleSort('fuelEfficiency')} style={{ cursor: 'pointer' }}>Fuel Efficiency (km/L) {sortKey === 'fuelEfficiency' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
            <th onClick={() => toggleSort('operationalCost')} style={{ cursor: 'pointer' }}>Operational Cost {sortKey === 'operationalCost' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
            <th onClick={() => toggleSort('roi')} style={{ cursor: 'pointer' }}>ROI (%) {sortKey === 'roi' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(r => (
            <tr key={r.vehicle_id}>
              <td>{r.registration_number}</td>
              <td>
                <span className={`fp-badge-${effStatus(r.fuelEfficiency)}`}>{r.fuelEfficiency}</span>
              </td>
              <td>₹{r.operationalCost.toLocaleString('en-IN')}</td>
              <td>
                <span className={`fp-badge-${roiStatus(r.roi)}`}>{r.roi}%</span>
              </td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr><td colSpan={4} style={{ textAlign: 'center', color: '#666' }}>No vehicle data yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
