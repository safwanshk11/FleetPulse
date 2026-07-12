const express = require('express');
const { pool, withTransaction } = require('../db/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();
router.use(requireAuth);

// GET /api/maintenance
router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(`
    SELECT maintenance_logs.*, vehicles.registration_number, vehicles.name_model
    FROM maintenance_logs
    JOIN vehicles ON vehicles.id = maintenance_logs.vehicle_id
    ORDER BY maintenance_logs.id DESC
  `);
  res.json(rows);
}));

// POST /api/maintenance — creating an Active record flips vehicle to 'In Shop'
router.post('/', requireRole('FleetManager'), asyncHandler(async (req, res) => {
  const { vehicle_id, description, cost, service_date } = req.body;
  if (!vehicle_id || !description) {
    return res.status(400).json({ error: 'vehicle_id and description are required' });
  }

  const vehicleRes = await pool.query('SELECT * FROM vehicles WHERE id = $1', [vehicle_id]);
  const vehicle = vehicleRes.rows[0];
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  if (vehicle.status === 'On Trip') {
    return res.status(400).json({ error: 'Vehicle is currently On Trip, cannot log maintenance' });
  }

  const log = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO maintenance_logs (vehicle_id, description, cost, service_date, status)
       VALUES ($1, $2, $3, COALESCE($4, CURRENT_DATE), 'Active') RETURNING *`,
      [vehicle_id, description, cost || 0, service_date || null]
    );
    await client.query(`UPDATE vehicles SET status = 'In Shop' WHERE id = $1`, [vehicle_id]);
    return rows[0];
  });

  res.status(201).json(log);
}));

// POST /api/maintenance/:id/close — closing restores vehicle to Available (unless Retired)
router.post('/:id/close', requireRole('FleetManager'), asyncHandler(async (req, res) => {
  const logRes = await pool.query('SELECT * FROM maintenance_logs WHERE id = $1', [req.params.id]);
  const log = logRes.rows[0];
  if (!log) return res.status(404).json({ error: 'Maintenance record not found' });
  if (log.status === 'Closed') return res.status(400).json({ error: 'Already closed' });

  await withTransaction(async (client) => {
    await client.query(`UPDATE maintenance_logs SET status = 'Closed' WHERE id = $1`, [log.id]);
    const vehicleRes = await client.query('SELECT * FROM vehicles WHERE id = $1', [log.vehicle_id]);
    if (vehicleRes.rows[0].status !== 'Retired') {
      await client.query(`UPDATE vehicles SET status = 'Available' WHERE id = $1`, [log.vehicle_id]);
    }
  });

  const updated = await pool.query('SELECT * FROM maintenance_logs WHERE id = $1', [log.id]);
  res.json(updated.rows[0]);
}));

module.exports = router;
