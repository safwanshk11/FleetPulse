// Trips.jsx — owner: Person B (People & Trips)
// Lifecycle per PDF 3.5: Draft -> Dispatched -> Completed / Cancelled.
// All validation (capacity, license, double-booking) happens server-side —
// this page just surfaces whatever error the backend returns.

import { useEffect, useState } from 'react';
import client from '../api/client';
import { useAuth } from '../api/AuthContext';

const STAGES = ['Draft', 'Dispatched', 'Completed'];

function statusKey(status) {
  return status.toLowerCase().replace(/\s+/g, '');
}

export default function Trips() {
  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    source: '', destination: '', vehicle_id: '', driver_id: '', cargo_weight: '', planned_distance: ''
  });
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const { user } = useAuth();

  const canManage = user?.role === 'Dispatcher' || user?.role === 'FleetManager';

  function loadAll() {
    client.get('/trips').then((res) => setTrips(res.data));
    client.get('/vehicles/dispatchable').then((res) => setVehicles(res.data));
    client.get('/drivers/dispatchable').then((res) => setDrivers(res.data));
  }
  useEffect(loadAll, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await client.post('/trips', form);
      setForm({ source: '', destination: '', vehicle_id: '', driver_id: '', cargo_weight: '', planned_distance: '' });
      setShowForm(false);
      loadAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create trip');
    }
  }

  async function handleAction(id, action) {
    setActionError('');
    try {
      await client.post(`/trips/${id}/${action}`);
      loadAll();
    } catch (err) {
      setActionError(err.response?.data?.error || `Failed to ${action} trip`);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>Trip dispatcher</h2>
        {canManage && (
          <button className="fp-btn fp-btn-primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Cancel' : '+ Create trip'}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <input className="fp-input" placeholder="Source" value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })} required />
          <input className="fp-input" placeholder="Destination" value={form.destination}
            onChange={(e) => setForm({ ...form, destination: e.target.value })} required />
          <select className="fp-input" value={form.vehicle_id}
            onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })} required>
            <option value="">Vehicle (available only)</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.registration_number} — {v.max_load_capacity}kg capacity</option>
            ))}
          </select>
          <select className="fp-input" value={form.driver_id}
            onChange={(e) => setForm({ ...form, driver_id: e.target.value })} required>
            <option value="">Driver (available only)</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <input className="fp-input" placeholder="Cargo weight (kg)" type="number" value={form.cargo_weight}
            onChange={(e) => setForm({ ...form, cargo_weight: e.target.value })} required />
          <input className="fp-input" placeholder="Planned distance (km)" type="number" value={form.planned_distance}
            onChange={(e) => setForm({ ...form, planned_distance: e.target.value })} />
          <button className="fp-btn" style={{ background: 'var(--status-ontrip)', color: '#071229' }} type="submit">
            Create draft
          </button>
          {error && <p className="fp-error" style={{ width: '100%' }}>{error}</p>}
        </form>
      )}

      {actionError && <p className="fp-error" style={{ marginBottom: 12 }}>{actionError}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {trips.map((t) => (
          <div key={t.id} className="fp-card" data-status={t.status}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="fp-mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                  TR{String(t.id).padStart(3, '0')}
                </div>
                <div style={{ fontSize: 14 }}>
                  {t.source} <span style={{ color: 'var(--text-muted)' }}>&rarr;</span> {t.destination}
                </div>
                <div className="fp-mono" style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                  {t.registration_number || 'no vehicle'} &middot; {t.driver_name || 'no driver'} &middot; {t.cargo_weight}kg
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span className={`fp-badge fp-badge-${statusKey(t.status)}`}>{t.status}</span>

                {canManage && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    {t.status === 'Draft' && (
                      <>
                        <button className="fp-btn fp-btn-primary" style={{ padding: '4px 10px', fontSize: 12 }}
                          onClick={() => handleAction(t.id, 'dispatch')}>Dispatch</button>
                        <button className="fp-btn fp-btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }}
                          onClick={() => handleAction(t.id, 'cancel')}>Cancel</button>
                      </>
                    )}
                    {t.status === 'Dispatched' && (
                      <>
                        <button className="fp-btn fp-btn-primary" style={{ padding: '4px 10px', fontSize: 12 }}
                          onClick={() => handleAction(t.id, 'complete')}>Complete</button>
                        <button className="fp-btn fp-btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }}
                          onClick={() => handleAction(t.id, 'cancel')}>Cancel</button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* lifecycle stepper — mirrors the mockup's dot progression */}
            {t.status !== 'Cancelled' && (
              <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                {STAGES.map((stage, i) => {
                  const currentIndex = STAGES.indexOf(t.status === 'Cancelled' ? 'Draft' : t.status);
                  const reached = i <= currentIndex;
                  return (
                    <div key={stage} style={{ flex: 1 }}>
                      <div style={{
                        height: 3, borderRadius: 2,
                        background: reached ? 'var(--accent)' : 'var(--border)'
                      }} />
                      <div className="fp-mono" style={{ fontSize: 9.5, marginTop: 4, color: reached ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                        {stage.toUpperCase()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
        {trips.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No trips yet</p>}
      </div>
    </div>
  );
}
