// db.js — PostgreSQL connection pool + schema + demo seed data.
// Requires DATABASE_URL in .env pointing at a real Postgres instance
// (local install, Docker, or a free host like Neon/Supabase).

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Run a function inside a BEGIN/COMMIT transaction, rolling back on error.
// Use this for any operation that touches more than one table, so
// business-rule status changes (e.g. dispatching a trip) can't half-apply.
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ---- Schema ----------------------------------------------------------

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('FleetManager','Dispatcher','SafetyOfficer','FinancialAnalyst')),
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id SERIAL PRIMARY KEY,
      registration_number TEXT UNIQUE NOT NULL,
      name_model TEXT NOT NULL,
      type TEXT NOT NULL,
      max_load_capacity NUMERIC NOT NULL,
      odometer NUMERIC DEFAULT 0,
      acquisition_cost NUMERIC DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Available' CHECK (status IN ('Available','On Trip','In Shop','Retired')),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS drivers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      license_number TEXT UNIQUE NOT NULL,
      license_category TEXT NOT NULL,
      license_expiry DATE NOT NULL,
      contact_number TEXT,
      safety_score INTEGER DEFAULT 100,
      status TEXT NOT NULL DEFAULT 'Available' CHECK (status IN ('Available','On Trip','Off Duty','Suspended')),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS trips (
      id SERIAL PRIMARY KEY,
      source TEXT NOT NULL,
      destination TEXT NOT NULL,
      vehicle_id INTEGER REFERENCES vehicles(id),
      driver_id INTEGER REFERENCES drivers(id),
      cargo_weight NUMERIC NOT NULL,
      planned_distance NUMERIC,
      final_odometer NUMERIC,
      fuel_consumed NUMERIC,
      status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Dispatched','Completed','Cancelled')),
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS maintenance_logs (
      id SERIAL PRIMARY KEY,
      vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
      description TEXT NOT NULL,
      cost NUMERIC DEFAULT 0,
      service_date DATE DEFAULT CURRENT_DATE,
      status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Closed')),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS fuel_logs (
      id SERIAL PRIMARY KEY,
      vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
      liters NUMERIC NOT NULL,
      cost NUMERIC NOT NULL,
      log_date DATE DEFAULT CURRENT_DATE
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
      trip_id INTEGER REFERENCES trips(id),
      expense_type TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      expense_date DATE DEFAULT CURRENT_DATE
    );
  `);

  // ---- Seed demo data (only runs once, on an empty users table) ------

  const { rows } = await pool.query('SELECT COUNT(*)::int AS c FROM users');
  if (rows[0].c === 0) {
    const demoUsers = [
      ['fleetmanager@fleetpulse.in', 'FleetManager', 'Raven K.'],
      ['dispatcher@fleetpulse.in', 'Dispatcher', 'Priya S.'],
      ['safety@fleetpulse.in', 'SafetyOfficer', 'Suresh M.'],
      ['finance@fleetpulse.in', 'FinancialAnalyst', 'Anita D.']
    ];
    for (const [email, role, name] of demoUsers) {
      // demo-only password: "password123" — change before any real deployment
      const hash = bcrypt.hashSync('password123', 10);
      await pool.query(
        'INSERT INTO users (email, password_hash, role, name) VALUES ($1, $2, $3, $4)',
        [email, hash, role, name]
      );
    }

    await pool.query(
      `INSERT INTO vehicles (registration_number, name_model, type, max_load_capacity, odometer, acquisition_cost, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      ['GJ01AB1234', 'Van-05', 'Van', 500, 14000, 620000, 'Available']
    );

    await pool.query(
      `INSERT INTO drivers (name, license_number, license_category, license_expiry, contact_number, safety_score, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      ['Alex', 'DL-88215', 'LMV', '2028-12-01', '9876500000', 96, 'Available']
    );

    console.log('Seeded demo users, one vehicle, and one driver.');
    console.log('Demo login: fleetmanager@fleetpulse.in / password123 (see other roles above)');
  }
}

module.exports = { pool, withTransaction, initDb };
