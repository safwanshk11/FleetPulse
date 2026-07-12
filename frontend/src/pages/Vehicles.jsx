// Vehicles.jsx — owner: Person A (Fleet & Assets)

import { useEffect, useState } from 'react';
import client from '../api/client';
import { useAuth } from '../api/AuthContext';

function statusKey(status) {
  return status.toLowerCase().replace(/\s+/g, '');
}

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ registration_number: '', name_model: '', type: '', max_load_capacity: '' });
  const [error, setError] = useState('');
  const { user } = useAuth();

  const canAdd = user?.role === 'FleetManager';

  function load() {
    client.get('/vehicles').then((res) => setVehicles(res.data));
  }

  useEffect(load, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    try {
      await client.post('/vehicles', form);
      setForm({ registration_number: '', name_model: '', type: '', max_load_capacity: '' });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add vehicle');
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>Vehicle registry</h2>
        {canAdd && (
          <button className="fp-btn fp-btn-primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Cancel' : '+ Add vehicle'}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <input className="fp-input" placeholder="Registration number" value={form.registration_number}
            onChange={(e) => setForm({ ...form, registration_number: e.target.value })} required />
          <input className="fp-input" placeholder="Name / model" value={form.name_model}
            onChange={(e) => setForm({ ...form, name_model: e.target.value })} required />
          <input className="fp-input" placeholder="Type (Van, Truck, Mini)" value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })} required />
          <input className="fp-input" placeholder="Max load capacity (kg)" type="number" value={form.max_load_capacity}
            onChange={(e) => setForm({ ...form, max_load_capacity: e.target.value })} required />
          <button className="fp-btn" style={{ background: 'var(--status-available)', color: '#0d1f14' }} type="submit">
            Save
          </button>
          {error && <p className="fp-error" style={{ width: '100%' }}>{error}</p>}
        </form>
      )}

      <table className="fp-table">
        <thead>
          <tr>
            <th>Reg. no.</th>
            <th>Name/model</th>
            <th>Type</th>
            <th>Capacity</th>
            <th>Odometer</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {vehicles.map((v) => (
            <tr key={v.id} className={`fp-row-${statusKey(v.status)}`}>
              <td className="fp-mono">{v.registration_number}</td>
              <td>{v.name_model}</td>
              <td>{v.type}</td>
              <td className="fp-mono">{v.max_load_capacity} kg</td>
              <td className="fp-mono">{v.odometer}</td>
              <td>
                <span className={`fp-badge fp-badge-${statusKey(v.status)}`}>{v.status}</span>
              </td>
            </tr>
          ))}
          {vehicles.length === 0 && (
            <tr><td colSpan={6} style={{ color: 'var(--text-muted)' }}>No vehicles registered yet</td></tr>
          )}
        </tbody>
      </table>

      <p className="fp-rule">
        Rule: registration number must be unique &middot; retired / in-shop vehicles are hidden from trip dispatcher
      </p>
    </div>
  );
}
