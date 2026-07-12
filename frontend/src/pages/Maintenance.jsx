import { useEffect, useState } from 'react';
import client from '../api/client';
import { useAuth } from '../api/AuthContext';

export default function Maintenance() {
  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ vehicle_id: '', description: '', cost: '', service_date: '' });
  const [error, setError] = useState('');
  const { user } = useAuth();

  const canManage = user?.role === 'FleetManager';

  async function load() {
    try {
      const [logsRes, vehiclesRes] = await Promise.all([
        client.get('/maintenance'),
        client.get('/vehicles')
      ]);
      setLogs(logsRes.data);
      setVehicles(vehiclesRes.data);
    } catch (err) {
      console.error('Failed to load maintenance data', err);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    try {
      await client.post('/maintenance', form);
      setForm({ vehicle_id: '', description: '', cost: '', service_date: '' });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add log');
    }
  }

  async function handleClose(id) {
    try {
      await client.post(`/maintenance/${id}/close`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to close log');
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>Maintenance logs</h2>
        {canManage && (
          <button className="fp-btn fp-btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ New log'}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <select className="fp-input" onChange={(e) => setForm({...form, vehicle_id: e.target.value})} required>
            <option value="">Select Vehicle</option>
            {vehicles.filter(v => v.status === 'Available').map(v => (
              <option key={v.id} value={v.id}>{v.registration_number} - {v.name_model}</option>
            ))}
          </select>
          <input className="fp-input" placeholder="Description" onChange={(e) => setForm({...form, description: e.target.value})} required />
          <input className="fp-input" type="number" placeholder="Cost" onChange={(e) => setForm({...form, cost: e.target.value})} />
          <button className="fp-btn" type="submit" style={{ background: 'var(--status-available)', color: '#0d1f14' }}>Save Log</button>
          {error && <p className="fp-error" style={{ width: '100%' }}>{error}</p>}
        </form>
      )}

      <table className="fp-table">
        <thead>
          <tr>
            <th>Reg. no.</th>
            <th>Description</th>
            <th>Cost</th>
            <th>Date</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td className="fp-mono">{log.registration_number}</td>
              <td>{log.description}</td>
              <td className="fp-mono">${log.cost}</td>
              <td className="fp-mono">{log.service_date ? new Date(log.service_date).toLocaleDateString() : '-'}</td>
              <td><span className={`fp-badge fp-badge-${log.status.toLowerCase()}`}>{log.status}</span></td>
              <td>
                {log.status === 'Active' && canManage && (
                  <button className="fp-btn" onClick={() => handleClose(log.id)}>Close</button>
                )}
              </td>
            </tr>
          ))}
          {logs.length === 0 && (
            <tr><td colSpan={6} style={{ color: 'var(--text-muted)' }}>No maintenance logs found</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}