// FuelExpenses.jsx — owner: Person C (Money & Insights)
// Two independent logs: Fuel entries and Expenses.
// Fuel POST requires FleetManager or Dispatcher (per backend requireRole).
// Expense POST requires FleetManager or FinancialAnalyst (per backend requireRole).

import { useEffect, useState } from 'react';
import client from '../api/client';
import { useAuth } from '../api/AuthContext';

export default function FuelExpenses() {
  const [fuelLogs, setFuelLogs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);

  const [showFuelForm, setShowFuelForm] = useState(false);
  const [fuelForm, setFuelForm] = useState({ vehicle_id: '', liters: '', cost: '', log_date: '' });
  const [fuelError, setFuelError] = useState('');

  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    vehicle_id: '', trip_id: '', expense_type: '', amount: '', expense_date: ''
  });
  const [expenseError, setExpenseError] = useState('');

  const { user } = useAuth();
  const canLogFuel = user?.role === 'FleetManager' || user?.role === 'Dispatcher';
  const canLogExpense = user?.role === 'FleetManager' || user?.role === 'FinancialAnalyst';

  function loadAll() {
    client.get('/fuel-expenses/fuel').then((res) => setFuelLogs(res.data));
    client.get('/fuel-expenses/expenses').then((res) => setExpenses(res.data));
    client.get('/vehicles').then((res) => setVehicles(res.data));
    client.get('/trips').then((res) => setTrips(res.data));
  }
  useEffect(loadAll, []);

  async function handleAddFuel(e) {
    e.preventDefault();
    setFuelError('');

    if (Number(fuelForm.liters) <= 0 || Number(fuelForm.cost) <= 0) {
      setFuelError('Liters and cost must be positive numbers');
      return;
    }

    try {
      await client.post('/fuel-expenses/fuel', {
        ...fuelForm,
        liters: Number(fuelForm.liters),
        cost: Number(fuelForm.cost),
        log_date: fuelForm.log_date || undefined
      });
      setFuelForm({ vehicle_id: '', liters: '', cost: '', log_date: '' });
      setShowFuelForm(false);
      loadAll();
    } catch (err) {
      setFuelError(err.response?.data?.error || 'Failed to add fuel entry');
    }
  }

  async function handleAddExpense(e) {
    e.preventDefault();
    setExpenseError('');

    if (Number(expenseForm.amount) <= 0) {
      setExpenseError('Amount must be a positive number');
      return;
    }

    try {
      await client.post('/fuel-expenses/expenses', {
        ...expenseForm,
        trip_id: expenseForm.trip_id || undefined,
        amount: Number(expenseForm.amount),
        expense_date: expenseForm.expense_date || undefined
      });
      setExpenseForm({ vehicle_id: '', trip_id: '', expense_type: '', amount: '', expense_date: '' });
      setShowExpenseForm(false);
      loadAll();
    } catch (err) {
      setExpenseError(err.response?.data?.error || 'Failed to add expense');
    }
  }

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>Fuel & expense management</h2>

      {/* ---- Fuel logs ---- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3>Fuel log</h3>
        {canLogFuel && (
          <button className="fp-btn fp-btn-primary" onClick={() => setShowFuelForm((s) => !s)}>
            {showFuelForm ? 'Cancel' : '+ Add fuel entry'}
          </button>
        )}
      </div>

      {showFuelForm && (
        <form onSubmit={handleAddFuel} style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <select className="fp-input" value={fuelForm.vehicle_id}
            onChange={(e) => setFuelForm({ ...fuelForm, vehicle_id: e.target.value })} required>
            <option value="">Vehicle</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.registration_number} — {v.name_model}</option>
            ))}
          </select>
          <input className="fp-input" placeholder="Liters" type="number" step="0.01" min="0" value={fuelForm.liters}
            onChange={(e) => setFuelForm({ ...fuelForm, liters: e.target.value })} required />
          <input className="fp-input" placeholder="Cost" type="number" step="0.01" min="0" value={fuelForm.cost}
            onChange={(e) => setFuelForm({ ...fuelForm, cost: e.target.value })} required />
          <input className="fp-input" type="date" value={fuelForm.log_date}
            onChange={(e) => setFuelForm({ ...fuelForm, log_date: e.target.value })} />
          <button className="fp-btn" style={{ background: 'var(--accent)', color: '#1b1204' }} type="submit">
            Save
          </button>
          {fuelError && <p className="fp-error" style={{ width: '100%' }}>{fuelError}</p>}
        </form>
      )}

      <table className="fp-table" style={{ marginBottom: 36 }}>
        <thead>
          <tr>
            <th>Vehicle</th>
            <th>Liters</th>
            <th>Cost</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {fuelLogs.map((f) => (
            <tr key={f.id}>
              <td className="fp-mono">{f.registration_number}</td>
              <td className="fp-mono">{f.liters}</td>
              <td className="fp-mono">{f.cost}</td>
              <td className="fp-mono">{f.log_date?.slice(0, 10)}</td>
            </tr>
          ))}
          {fuelLogs.length === 0 && (
            <tr><td colSpan={4} style={{ color: 'var(--text-muted)' }}>No fuel entries yet</td></tr>
          )}
        </tbody>
      </table>

      {/* ---- Expenses ---- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3>Expenses</h3>
        {canLogExpense && (
          <button className="fp-btn fp-btn-primary" onClick={() => setShowExpenseForm((s) => !s)}>
            {showExpenseForm ? 'Cancel' : '+ Add expense'}
          </button>
        )}
      </div>

      {showExpenseForm && (
        <form onSubmit={handleAddExpense} style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <select className="fp-input" value={expenseForm.vehicle_id}
            onChange={(e) => setExpenseForm({ ...expenseForm, vehicle_id: e.target.value })} required>
            <option value="">Vehicle</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.registration_number} — {v.name_model}</option>
            ))}
          </select>
          <select className="fp-input" value={expenseForm.trip_id}
            onChange={(e) => setExpenseForm({ ...expenseForm, trip_id: e.target.value })}>
            <option value="">Trip (optional)</option>
            {trips.map((t) => (
              <option key={t.id} value={t.id}>TR{String(t.id).padStart(3, '0')} — {t.source} → {t.destination}</option>
            ))}
          </select>
          <input className="fp-input" placeholder="Expense type (Toll, Fine, Parking...)" value={expenseForm.expense_type}
            onChange={(e) => setExpenseForm({ ...expenseForm, expense_type: e.target.value })} required />
          <input className="fp-input" placeholder="Amount" type="number" step="0.01" min="0" value={expenseForm.amount}
            onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} required />
          <input className="fp-input" type="date" value={expenseForm.expense_date}
            onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })} />
          <button className="fp-btn" style={{ background: 'var(--accent)', color: '#1b1204' }} type="submit">
            Save
          </button>
          {expenseError && <p className="fp-error" style={{ width: '100%' }}>{expenseError}</p>}
        </form>
      )}

      <table className="fp-table">
        <thead>
          <tr>
            <th>Vehicle</th>
            <th>Type</th>
            <th>Amount</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((ex) => (
            <tr key={ex.id}>
              <td className="fp-mono">{ex.registration_number}</td>
              <td>{ex.expense_type}</td>
              <td className="fp-mono">{ex.amount}</td>
              <td className="fp-mono">{ex.expense_date?.slice(0, 10)}</td>
            </tr>
          ))}
          {expenses.length === 0 && (
            <tr><td colSpan={4} style={{ color: 'var(--text-muted)' }}>No expenses logged yet</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}