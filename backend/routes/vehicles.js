const express = require('express');
const { pool } = require('../db/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();
router.use(requireAuth);

// GET /api/vehicles — list all vehicles (optional ?status=Available filter)
router.get('/', asyncHandler(async (req, res) => {
  const { status } = req.query;
  const { rows } = status
    ? await pool.query('SELECT * FROM vehicles WHERE status = $1 ORDER BY id DESC', [status])
    : await pool.query('SELECT * FROM vehicles ORDER BY id DESC');
  res.json(rows);
}));

// GET /api/vehicles/dispatchable — only vehicles eligible for a new trip
// (Retired / In Shop must never appear in the dispatch pool — see business rules)
router.get('/dispatchable', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM vehicles WHERE status = 'Available'`);
  res.json(rows);
}));

// POST /api/vehicles — register a new vehicle (Fleet Manager only)
router.post('/', requireRole('FleetManager'), asyncHandler(async (req, res) => {
  const { registration_number, name_model, type, max_load_capacity, odometer, acquisition_cost } = req.body;
  if (!registration_number || !name_model || !type || !max_load_capacity) {
    return res.status(400).json({ error: 'registration_number, name_model, type, max_load_capacity are required' });
  }

  const existing = await pool.query('SELECT id FROM vehicles WHERE registration_number = $1', [registration_number]);
  if (existing.rows.length > 0) {
    return res.status(409).json({ error: 'Registration number must be unique' });
  }

  const { rows } = await pool.query(
    `INSERT INTO vehicles (registration_number, name_model, type, max_load_capacity, odometer, acquisition_cost, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'Available') RETURNING *`,
    [registration_number, name_model, type, max_load_capacity, odometer || 0, acquisition_cost || 0]
  );

  res.status(201).json(rows[0]);
}));

// PATCH /api/vehicles/:id/status — manual status override (Fleet Manager only)
router.patch('/:id/status', requireRole('FleetManager'), asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowed = ['Available', 'On Trip', 'In Shop', 'Retired'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${allowed.join(', ')}` });
  }
  const { rows } = await pool.query('UPDATE vehicles SET status = $1 WHERE id = $2 RETURNING *', [status, req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Vehicle not found' });
  res.json(rows[0]);
}));

module.exports = router;
