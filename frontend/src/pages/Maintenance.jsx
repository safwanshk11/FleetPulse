// Maintenance.jsx — owner: Person A (Fleet & Assets)
// Business rule (from PDF 3.6): creating an active maintenance record flips
// the vehicle to 'In Shop', removing it from the dispatch pool. Closing it
// restores 'Available' (unless the vehicle is Retired).

import { useEffect, useState } from 'react';
import client from '../api/client';
import { useAuth } from '../api/AuthContext';

function statusKey(status) {
  return status.toLowerCase().replace(/\s+/g, '');
}

export default function Maintenance() {
  const [records, setRecords] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ vehicle_id: '', description: '', cost: '' });
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const { user } = useAuth();

  const canManage = user?.role === 'FleetManager';

  function loadRecords() {
    client.get('/maintenance').then((res) => setRecords(res.data));
  }
  function loadVehicles() {
    client.get('/vehicles').then((res) => setVehicles(res.data));
  }

  useEffect(() => {
    loadRecords();
    loadVehicles();
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    try {
      await client.post('/maintenance', {
        vehicle_id: form.vehicle_id,
        description: form.description,
        cost: form.cost || 0
      });
      setForm({ vehicle_id: '', description: '', cost: '' });
      setShowForm(false);
      loadRecords();
      loadVehicles(); // vehicle status just changed to In Shop
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to log maintenance');
    }
  }

  async function handleClose(id) {
    setActionError('');
    try {
      await client.post(`/maintenance/${id}/close`);
      loadRecords();
      loadVehicles();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to close record');
    }
  }

  // Only vehicles not currently On Trip can get a new maintenance record (backend enforces this too)
  const eligibleVehicles = vehicles.filter((v) => v.status !== 'On Trip');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>Maintenance</h2>
        {canManage && (
          <button className="fp-btn fp-btn-primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Cancel' : '+ Log service record'}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <select className="fp-input" value={form.vehicle_id}
            onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })} required>
            <option value="">Select vehicle</option>
            {eligibleVehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.registration_number} — {v.name_model}</option>
            ))}
          </select>
          <input className="fp-input" placeholder="Service type (e.g. Oil Change)" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          <input className="fp-input" placeholder="Cost" type="number" value={form.cost}
            onChange={(e) => setForm({ ...form, cost: e.target.value })} />
          <button className="fp-btn" style={{ background: 'var(--status-inshop)', color: '#231704' }} type="submit">
            Save
          </button>
          {error && <p className="fp-error" style={{ width: '100%' }}>{error}</p>}
        </form>
      )}

      {actionError && <p className="fp-error" style={{ marginBottom: 12 }}>{actionError}</p>}

      <table className="fp-table">
        <thead>
          <tr>
            <th>Vehicle</th>
            <th>Service</th>
            <th>Cost</th>
            <th>Date</th>
            <th>Status</th>
            {canManage && <th></th>}
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id} className={`fp-row-${statusKey(r.status)}`}>
              <td className="fp-mono">{r.registration_number}</td>
              <td>{r.description}</td>
              <td className="fp-mono">{r.cost}</td>
              <td className="fp-mono">{new Date(r.service_date).toLocaleDateString()}</td>
              <td><span className={`fp-badge fp-badge-${statusKey(r.status)}`}>{r.status}</span></td>
              {canManage && (
                <td>
                  {r.status === 'Active' && (
                    <button className="fp-btn fp-btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }}
                      onClick={() => handleClose(r.id)}>
                      Close
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
          {records.length === 0 && (
            <tr><td colSpan={canManage ? 6 : 5} style={{ color: 'var(--text-muted)' }}>No maintenance records yet</td></tr>
          )}
        </tbody>
      </table>

      <p className="fp-rule">
        Rule: active record &rarr; vehicle status becomes In Shop, hidden from dispatch &middot; closing &rarr; vehicle returns to Available (unless Retired)
      </p>
    </div>
  );
}
