const express = require('express');
const { pool, withTransaction } = require('../db/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();
router.use(requireAuth);


// GET /api/trips
router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(`
    SELECT trips.*, vehicles.registration_number, vehicles.name_model, drivers.name AS driver_name
    FROM trips
    LEFT JOIN vehicles ON vehicles.id = trips.vehicle_id
    LEFT JOIN drivers ON drivers.id = trips.driver_id
    ORDER BY trips.id DESC
  `);
  res.json(rows);
}));

// POST /api/trips — create a Draft trip (Dispatcher, Fleet Manager)
router.post('/', requireRole('Dispatcher', 'FleetManager'), asyncHandler(async (req, res) => {
  const { source, destination, vehicle_id, driver_id, cargo_weight, planned_distance } = req.body;
  if (!source || !destination || !cargo_weight) {
    return res.status(400).json({ error: 'source, destination, cargo_weight are required' });
  }

  const { rows } = await pool.query(
    `INSERT INTO trips (source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, status, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, 'Draft', $7) RETURNING *`,
    [source, destination, vehicle_id || null, driver_id || null, cargo_weight, planned_distance || null, req.user.id]
  );

  res.status(201).json(rows[0]);
}));

// POST /api/trips/:id/dispatch — validates every mandatory business rule,
// then flips both vehicle and driver to 'On Trip'
router.post('/:id/dispatch', requireRole('Dispatcher', 'FleetManager'), asyncHandler(async (req, res) => {
  const tripRes = await pool.query('SELECT * FROM trips WHERE id = $1', [req.params.id]);
  const trip = tripRes.rows[0];
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  if (trip.status !== 'Draft') return res.status(400).json({ error: 'Only Draft trips can be dispatched' });
  if (!trip.vehicle_id || !trip.driver_id) {
    return res.status(400).json({ error: 'Trip needs a vehicle and driver assigned before dispatch' });
  }

  const vehicle = (await pool.query('SELECT * FROM vehicles WHERE id = $1', [trip.vehicle_id])).rows[0];
  const driver = (await pool.query('SELECT * FROM drivers WHERE id = $1', [trip.driver_id])).rows[0];

  // Rule: Retired/In Shop vehicles and a vehicle already On Trip can't dispatch
  if (vehicle.status !== 'Available') {
    return res.status(400).json({ error: `Vehicle is '${vehicle.status}', not Available` });
  }
  // Rule: expired license or Suspended driver can't be assigned
  if (driver.status !== 'Available') {
    return res.status(400).json({ error: `Driver is '${driver.status}', not Available` });
  }
  const today = new Date().toISOString().slice(0, 10);
  if (driver.license_expiry.toISOString().slice(0, 10) < today) {
    return res.status(400).json({ error: 'Driver license is expired' });
  }
  // Rule: cargo weight must not exceed vehicle max load capacity
  if (Number(trip.cargo_weight) > Number(vehicle.max_load_capacity)) {
    return res.status(400).json({
      error: `Cargo weight (${trip.cargo_weight}kg) exceeds vehicle capacity (${vehicle.max_load_capacity}kg)`
    });
  }

  await withTransaction(async (client) => {
    await client.query(`UPDATE trips SET status = 'Dispatched' WHERE id = $1`, [trip.id]);
    await client.query(`UPDATE vehicles SET status = 'On Trip' WHERE id = $1`, [vehicle.id]);
    await client.query(`UPDATE drivers SET status = 'On Trip' WHERE id = $1`, [driver.id]);
  });

  const updated = await pool.query('SELECT * FROM trips WHERE id = $1', [trip.id]);
  res.json(updated.rows[0]);
}));

// POST /api/trips/:id/complete — records final odometer + fuel, frees vehicle/driver
router.post('/:id/complete', requireRole('Dispatcher', 'FleetManager'), asyncHandler(async (req, res) => {
  const { final_odometer, fuel_consumed } = req.body;
  const tripRes = await pool.query('SELECT * FROM trips WHERE id = $1', [req.params.id]);
  const trip = tripRes.rows[0];
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  if (trip.status !== 'Dispatched') return res.status(400).json({ error: 'Only Dispatched trips can be completed' });

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE trips SET status = 'Completed', final_odometer = $1, fuel_consumed = $2 WHERE id = $3`,
      [final_odometer || null, fuel_consumed || null, trip.id]
    );
    if (final_odometer) {
      await client.query(`UPDATE vehicles SET odometer = $1, status = 'Available' WHERE id = $2`, [final_odometer, trip.vehicle_id]);
    } else {
      await client.query(`UPDATE vehicles SET status = 'Available' WHERE id = $1`, [trip.vehicle_id]);
    }
    await client.query(`UPDATE drivers SET status = 'Available' WHERE id = $1`, [trip.driver_id]);
  });

  const updated = await pool.query('SELECT * FROM trips WHERE id = $1', [trip.id]);
  res.json(updated.rows[0]);
}));

// POST /api/trips/:id/cancel — restores vehicle/driver to Available if it had been dispatched
router.post('/:id/cancel', requireRole('Dispatcher', 'FleetManager'), asyncHandler(async (req, res) => {
  const tripRes = await pool.query('SELECT * FROM trips WHERE id = $1', [req.params.id]);
  const trip = tripRes.rows[0];
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  if (trip.status === 'Completed' || trip.status === 'Cancelled') {
    return res.status(400).json({ error: `Trip already ${trip.status}` });
  }

  await withTransaction(async (client) => {
    await client.query(`UPDATE trips SET status = 'Cancelled' WHERE id = $1`, [trip.id]);
    if (trip.status === 'Dispatched') {
      await client.query(`UPDATE vehicles SET status = 'Available' WHERE id = $1`, [trip.vehicle_id]);
      await client.query(`UPDATE drivers SET status = 'Available' WHERE id = $1`, [trip.driver_id]);
    }
  });

  const updated = await pool.query('SELECT * FROM trips WHERE id = $1', [trip.id]);
  res.json(updated.rows[0]);
}));

module.exports = router;
