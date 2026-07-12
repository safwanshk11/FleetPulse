# FleetPulse — Smart Transport Operations Platform

A centralized platform for fleet operations: vehicles, drivers, trips, maintenance, and expenses,
with role-based access and automatic status enforcement.

## Stack
- **Backend:** Node.js + Express + PostgreSQL (`pg`) + JWT auth
- **Frontend:** React (Vite) + React Router + Axios

The schema lives in `backend/db/db.js` and is created automatically (`CREATE TABLE IF NOT EXISTS`)
the first time the server starts against your database.

## Quick start

### 1. Get a Postgres database
Pick whichever is easiest for your team:
- **Local install** — `sudo apt install postgresql` (Linux) or Postgres.app (Mac), then
  `createdb fleetpulse`.
- **Docker** — `docker run --name fleetpulse-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=fleetpulse -p 5432:5432 -d postgres:16`
- **Free hosted (easiest for a 3-person team, no local install needed)** — [Neon](https://neon.tech)
  or [Supabase](https://supabase.com) both have a free tier. Create a project, copy the connection
  string they give you.

### 2. Backend
```bash
cd backend
cp .env.example .env   # then edit DATABASE_URL to point at your Postgres instance
npm install
npm start
```
Runs on `http://localhost:4000`. On first run it creates all tables and seeds 4 demo users
(one per role) plus one demo vehicle and driver.

> If you're using a hosted free-tier Postgres, share the same `DATABASE_URL` across all 3 of you
> (put it in a team doc, not in git) so everyone works against the same live data.

**Demo logins** (password for all: `password123`):
| Role | Email |
|---|---|
| Fleet Manager | fleetmanager@fleetpulse.in |
| Dispatcher | dispatcher@fleetpulse.in |
| Safety Officer | safety@fleetpulse.in |
| Financial Analyst | finance@fleetpulse.in |

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
Runs on `http://localhost:5173` and proxies `/api` requests to the backend on port 4000.

## Project structure
```
backend/
  db/db.js            -- schema + seed data
  middleware/auth.js   -- JWT verification + role-based access control
  routes/               -- one file per resource (auth, vehicles, drivers, trips, maintenance, fuel-expenses, reports)
  server.js

frontend/
  src/api/client.js       -- shared axios instance (auto-attaches JWT)
  src/api/AuthContext.jsx -- logged-in user/role, available via useAuth()
  src/components/Layout.jsx -- sidebar nav + header
  src/pages/
    Login.jsx      -- done
    Dashboard.jsx  -- done (KPI cards + recent trips)
    Vehicles.jsx   -- done (full CRUD template — copy this pattern for the rest)
    Stubs.jsx      -- Drivers / Trips / Maintenance / Fuel & Expenses / Analytics placeholders
```

## Suggested 3-person split
Each person owns their tables end-to-end (DB → route → page):

| Person | Owns | Backend files | Frontend page(s) |
|---|---|---|---|
| **A — Fleet & Assets** | Vehicles, Maintenance | `routes/vehicles.js`, `routes/maintenance.js` | Vehicles.jsx (done), Maintenance |
| **B — People & Trips** | Auth, Drivers, Trips | `routes/auth.js`, `routes/drivers.js`, `routes/trips.js` | Login (done), Drivers, Trips |
| **C — Money & Insights** | Fuel, Expenses, Reports | `routes/fuelExpenses.js`, `routes/reports.js` | Dashboard (done), Fuel & Expenses, Analytics |

## Business rules already implemented in the backend
- Vehicle registration number and driver license number must be unique
- Retired vehicles / expired-license or Suspended drivers can never be dispatched
- Cargo weight must not exceed vehicle max load capacity (checked on dispatch)
- Dispatching a trip sets both vehicle and driver to `On Trip`; completing or cancelling
  restores them to `Available`
- Creating an active maintenance record sets the vehicle to `In Shop` and removes it from the
  dispatch pool; closing the record restores it to `Available` (unless Retired)
- All of the above run inside SQLite transactions so status changes can't get out of sync

## Suggested build order
1. Auth (done) → confirm login works for all 4 roles
2. Vehicles + Drivers (parallel, Person A & B)
3. Trips (needs both of the above)
4. Maintenance
5. Fuel & Expenses
6. Dashboard/Analytics last — wire to real data once other tables have records
   (the Dashboard page already works, it'll just show zeros until there's data)

## Git workflow
Create one feature branch per module (`feature/vehicles`, `feature/trips`, etc.) and open PRs —
avoids one person owning the whole repo, which the hackathon rules call out explicitly.
