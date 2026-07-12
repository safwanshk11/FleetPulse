const express = require('express');
const { pool } = require('../db/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();
router.use(requireAuth);

// GET /api/drivers
router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM drivers ORDER BY id DESC');
  res.json(rows);
}));

// GET /api/drivers/dispatchable — Available, not Suspended, license not expired
router.get('/dispatchable', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM drivers WHERE status = 'Available' AND license_expiry >= CURRENT_DATE`
  );
  res.json(rows);
}));

// POST /api/drivers — Fleet Manager or Safety Officer
router.post('/', requireRole('FleetManager', 'SafetyOfficer'), asyncHandler(async (req, res) => {
  const { name, license_number, license_category, license_expiry, contact_number } = req.body;
  if (!name || !license_number || !license_category || !license_expiry) {
    return res.status(400).json({ error: 'name, license_number, license_category, license_expiry are required' });
  }

  const existing = await pool.query('SELECT id FROM drivers WHERE license_number = $1', [license_number]);
  if (existing.rows.length > 0) {
    return res.status(409).json({ error: 'License number must be unique' });
  }

  const { rows } = await pool.query(
    `INSERT INTO drivers (name, license_number, license_category, license_expiry, contact_number, safety_score, status)
     VALUES ($1, $2, $3, $4, $5, 100, 'Available') RETURNING *`,
    [name, license_number, license_category, license_expiry, contact_number || null]
  );

  res.status(201).json(rows[0]);
}));

// PATCH /api/drivers/:id/status — e.g. Safety Officer suspends a driver
router.patch('/:id/status', requireRole('FleetManager', 'SafetyOfficer'), asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowed = ['Available', 'On Trip', 'Off Duty', 'Suspended'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${allowed.join(', ')}` });
  }
  const { rows } = await pool.query('UPDATE drivers SET status = $1 WHERE id = $2 RETURNING *', [status, req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Driver not found' });
  res.json(rows[0]);
}));

module.exports = router;
