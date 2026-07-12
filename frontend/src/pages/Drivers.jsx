// Drivers.jsx — owner: Person B (People & Trips)
// Fields per PDF 3.4: Name, License Number, License Category, License Expiry
// Date, Contact Number, Safety Score, Status (Available/On Trip/Off Duty/Suspended)

import { useEffect, useState } from 'react';
import client from '../api/client';
import { useAuth } from '../api/AuthContext';

function statusKey(status) {
  return status.toLowerCase().replace(/\s+/g, '');
}

export default function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', license_number: '', license_category: '', license_expiry: '', contact_number: ''
  });
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const { user } = useAuth();

  const canManage = user?.role === 'FleetManager' || user?.role === 'SafetyOfficer';

  function load() {
    client.get('/drivers').then((res) => setDrivers(res.data));
  }
  useEffect(load, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    try {
      await client.post('/drivers', form);
      setForm({ name: '', license_number: '', license_category: '', license_expiry: '', contact_number: '' });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add driver');
    }
  }

  async function handleStatusChange(id, status) {
    setActionError('');
    try {
      await client.patch(`/drivers/${id}/status`, { status });
      load();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to update status');
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>Drivers & safety profiles</h2>
        {canManage && (
          <button className="fp-btn fp-btn-primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Cancel' : '+ Add driver'}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <input className="fp-input" placeholder="Full name" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="fp-input" placeholder="License number" value={form.license_number}
            onChange={(e) => setForm({ ...form, license_number: e.target.value })} required />
          <input className="fp-input" placeholder="Category (e.g. LMV, HMV)" value={form.license_category}
            onChange={(e) => setForm({ ...form, license_category: e.target.value })} required />
          <input className="fp-input" type="date" value={form.license_expiry}
            onChange={(e) => setForm({ ...form, license_expiry: e.target.value })} required />
          <input className="fp-input" placeholder="Contact number" value={form.contact_number}
            onChange={(e) => setForm({ ...form, contact_number: e.target.value })} />
          <button className="fp-btn" style={{ background: 'var(--status-available)', color: '#0d1f14' }} type="submit">
            Save
          </button>
          {error && <p className="fp-error" style={{ width: '100%' }}>{error}</p>}
        </form>
      )}

      {actionError && <p className="fp-error" style={{ marginBottom: 12 }}>{actionError}</p>}

      <table className="fp-table">
        <thead>
          <tr>
            <th>Driver</th>
            <th>License no.</th>
            <th>Category</th>
            <th>Expiry</th>
            <th>Safety score</th>
            <th>Status</th>
            {canManage && <th></th>}
          </tr>
        </thead>
        <tbody>
          {drivers.map((d) => {
            const expired = d.license_expiry && d.license_expiry.slice(0, 10) < today;
            return (
              <tr key={d.id} className={`fp-row-${statusKey(d.status)}`}>
                <td>{d.name}</td>
                <td className="fp-mono">{d.license_number}</td>
                <td className="fp-mono">{d.license_category}</td>
                <td className="fp-mono" style={{ color: expired ? 'var(--status-retired)' : undefined }}>
                  {new Date(d.license_expiry).toLocaleDateString()}{expired ? ' (expired)' : ''}
                </td>
                <td className="fp-mono">{d.safety_score}%</td>
                <td><span className={`fp-badge fp-badge-${statusKey(d.status)}`}>{d.status}</span></td>
                {canManage && (
                  <td>
                    {d.status !== 'Suspended' ? (
                      <button className="fp-btn fp-btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }}
                        onClick={() => handleStatusChange(d.id, 'Suspended')}>
                        Suspend
                      </button>
                    ) : (
                      <button className="fp-btn fp-btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }}
                        onClick={() => handleStatusChange(d.id, 'Available')}>
                        Reinstate
                      </button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
          {drivers.length === 0 && (
            <tr><td colSpan={canManage ? 7 : 6} style={{ color: 'var(--text-muted)' }}>No drivers registered yet</td></tr>
          )}
        </tbody>
      </table>

      <p className="fp-rule">
        Rule: expired license or Suspended status &rarr; blocked from trip assignment
      </p>
    </div>
  );
}
