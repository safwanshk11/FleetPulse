const express = require('express');
const { pool } = require('../db/db');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();
router.use(requireAuth);

async function countWhere(sql, params = []) {
  const { rows } = await pool.query(sql, params);
  return rows[0].c;
}

async function sumWhere(sql, params = []) {
  const { rows } = await pool.query(sql, params);
  return Number(rows[0].s) || 0;
}

// GET /api/reports/dashboard — powers the KPI cards on screen 1
router.get('/dashboard', asyncHandler(async (req, res) => {
  const activeVehicles = await countWhere(`SELECT COUNT(*)::int AS c FROM vehicles WHERE status != 'Retired'`);
  const availableVehicles = await countWhere(`SELECT COUNT(*)::int AS c FROM vehicles WHERE status = 'Available'`);
  const inMaintenance = await countWhere(`SELECT COUNT(*)::int AS c FROM vehicles WHERE status = 'In Shop'`);
  const activeTrips = await countWhere(`SELECT COUNT(*)::int AS c FROM trips WHERE status = 'Dispatched'`);
  const pendingTrips = await countWhere(`SELECT COUNT(*)::int AS c FROM trips WHERE status = 'Draft'`);
  const driversOnDuty = await countWhere(`SELECT COUNT(*)::int AS c FROM drivers WHERE status = 'On Trip'`);

  const totalVehicles = await countWhere(`SELECT COUNT(*)::int AS c FROM vehicles`);
  const totalDrivers = await countWhere(`SELECT COUNT(*)::int AS c FROM drivers`);
  const onTrip = await countWhere(`SELECT COUNT(*)::int AS c FROM vehicles WHERE status = 'On Trip'`);
  const fleetUtilization = totalVehicles > 0 ? Math.round((onTrip / totalVehicles) * 100) : 0;

  const totalFuelCost = await sumWhere(`SELECT COALESCE(SUM(cost), 0) AS s FROM fuel_logs`);
  const totalMaintenanceCost = await sumWhere(`SELECT COALESCE(SUM(cost), 0) AS s FROM maintenance_logs`);
  const totalOperationalCost = totalFuelCost + totalMaintenanceCost;

  const recentTripsRes = await pool.query(`
    SELECT
      trips.id,
      vehicles.registration_number,
      drivers.name AS driver_name,
      trips.status,
      CASE
        WHEN trips.status = 'Dispatched' AND trips.planned_distance IS NOT NULL
        THEN ROUND(trips.planned_distance / 60.0 * 60)
        ELSE NULL
      END AS eta_minutes
    FROM trips
    LEFT JOIN vehicles ON vehicles.id = trips.vehicle_id
    LEFT JOIN drivers ON drivers.id = trips.driver_id
    ORDER BY trips.id DESC LIMIT 5
  `);

  res.json({
    activeVehicles, availableVehicles, inMaintenance, activeTrips, pendingTrips,
    driversOnDuty, fleetUtilization,
    totalVehicles, totalDrivers,
    totalFuelCost, totalMaintenanceCost, totalOperationalCost,
    recentTrips: recentTripsRes.rows
  });
}));

// GET /api/reports/analytics — fuel efficiency, cost, and ROI per vehicle
router.get('/analytics', asyncHandler(async (req, res) => {
  const { rows: vehicles } = await pool.query('SELECT * FROM vehicles');

  const results = [];
  for (const v of vehicles) {
    const fuelRes = await pool.query(
      'SELECT COALESCE(SUM(cost),0) AS c, COALESCE(SUM(liters),0) AS l FROM fuel_logs WHERE vehicle_id = $1',
      [v.id]
    );
    const maintRes = await pool.query(
      `SELECT COALESCE(SUM(cost),0) AS c FROM maintenance_logs WHERE vehicle_id = $1`,
      [v.id]
    );
    const distRes = await pool.query(
      `SELECT COALESCE(SUM(planned_distance),0) AS d FROM trips WHERE vehicle_id = $1 AND status = 'Completed'`,
      [v.id]
    );

    const fuelCost = Number(fuelRes.rows[0].c);
    const fuelLiters = Number(fuelRes.rows[0].l);
    const maintCost = Number(maintRes.rows[0].c);
    const distance = Number(distRes.rows[0].d);

    const operationalCost = fuelCost + maintCost;
    const fuelEfficiency = fuelLiters > 0 ? +(distance / fuelLiters).toFixed(1) : 0;
    // ROI placeholder: revenue isn't tracked yet — wire this up once a revenue/rate field exists
    const roi = Number(v.acquisition_cost) > 0 ? +(((0 - operationalCost) / Number(v.acquisition_cost)) * 100).toFixed(1) : 0;

    results.push({
      vehicle_id: v.id,
      registration_number: v.registration_number,
      fuelEfficiency,
      operationalCost,
      roi
    });
  }

  res.json(results);
}));

module.exports = router;
