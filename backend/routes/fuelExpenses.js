const express = require('express');
const { pool } = require('../db/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();
router.use(requireAuth);

// GET /api/fuel-expenses/fuel
router.get('/fuel', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(`
    SELECT fuel_logs.*, vehicles.registration_number, vehicles.name_model
    FROM fuel_logs JOIN vehicles ON vehicles.id = fuel_logs.vehicle_id
    ORDER BY fuel_logs.id DESC
  `);
  res.json(rows);
}));

// POST /api/fuel-expenses/fuel
router.post('/fuel', requireRole('FleetManager', 'Dispatcher'), asyncHandler(async (req, res) => {
  const { vehicle_id, liters, cost, log_date } = req.body;
  if (!vehicle_id || !liters || !cost) {
    return res.status(400).json({ error: 'vehicle_id, liters, cost are required' });
  }
  const { rows } = await pool.query(
    `INSERT INTO fuel_logs (vehicle_id, liters, cost, log_date) VALUES ($1, $2, $3, COALESCE($4, CURRENT_DATE)) RETURNING *`,
    [vehicle_id, liters, cost, log_date || null]
  );
  res.status(201).json(rows[0]);
}));

// GET /api/fuel-expenses/expenses
router.get('/expenses', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(`
    SELECT expenses.*, vehicles.registration_number
    FROM expenses JOIN vehicles ON vehicles.id = expenses.vehicle_id
    ORDER BY expenses.id DESC
  `);
  res.json(rows);
}));

// POST /api/fuel-expenses/expenses
router.post('/expenses', requireRole('FleetManager', 'FinancialAnalyst'), asyncHandler(async (req, res) => {
  const { vehicle_id, trip_id, expense_type, amount, expense_date } = req.body;
  if (!vehicle_id || !expense_type || !amount) {
    return res.status(400).json({ error: 'vehicle_id, expense_type, amount are required' });
  }
  const { rows } = await pool.query(
    `INSERT INTO expenses (vehicle_id, trip_id, expense_type, amount, expense_date)
     VALUES ($1, $2, $3, $4, COALESCE($5, CURRENT_DATE)) RETURNING *`,
    [vehicle_id, trip_id || null, expense_type, amount, expense_date || null]
  );
  res.status(201).json(rows[0]);
}));

module.exports = router;
