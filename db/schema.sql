-- ============================================================================
-- Zuri Business OS — database schema
--
-- Safe to run against the live database: every statement is guarded, so it
-- creates what's missing and leaves what's there alone. Run it on a fresh
-- Neon branch to get a working copy for development.
--
-- Order matters — tables that are referenced come first.
-- ============================================================================

-- ── enums ───────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('super_admin', 'staff', 'driver');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── people who sign in ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  full_name   TEXT NOT NULL,
  email       TEXT UNIQUE,
  password    TEXT NOT NULL,
  role        user_role NOT NULL DEFAULT 'staff',
  phone       TEXT,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── customers ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id          SERIAL PRIMARY KEY,
  full_name   TEXT NOT NULL,
  phone       TEXT,
  email       TEXT,
  address     TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── fleet ───────────────────────────────────────────────────────────────────
-- status holds only what a person decides: 'available' or 'maintenance'.
-- 'on_hire' and 'booked' are worked out from the bookings at read time.
CREATE TABLE IF NOT EXISTS vehicles (
  id                       SERIAL PRIMARY KEY,
  make                     TEXT NOT NULL,
  model                    TEXT NOT NULL,
  year                     INTEGER,
  plate_number             TEXT,
  category                 TEXT,
  seats                    INTEGER,
  fuel_type                TEXT DEFAULT 'Diesel',
  transmission             TEXT DEFAULT 'Automatic',
  color                    TEXT,
  status                   TEXT DEFAULT 'available',

  insurance_expiry         DATE,
  operating_licence_expiry DATE,
  registration_expiry      DATE,
  road_worthiness_expiry   DATE,
  tra_sticker_expiry       DATE,

  last_service_date        DATE,
  next_service_date        DATE,
  service_notes            TEXT,

  notes                    TEXT,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

-- ── drivers ─────────────────────────────────────────────────────────────────
-- Drivers don't sign in; user_id is legacy and stays nullable.
-- status holds only 'available' or 'leave' — 'on_duty' comes from the trips.
CREATE TABLE IF NOT EXISTS drivers (
  id                      SERIAL PRIMARY KEY,
  user_id                 INTEGER REFERENCES users(id),
  full_name               TEXT NOT NULL,
  phone                   TEXT,
  email                   TEXT,
  status                  TEXT DEFAULT 'available',

  license_number          TEXT,
  license_class           TEXT,
  license_expiry          DATE,
  psv_badge_number        TEXT,
  psv_badge_expiry        DATE,
  good_conduct_expiry     DATE,

  emergency_contact_name  TEXT,
  emergency_contact_phone TEXT,

  uniform_compliant       BOOLEAN DEFAULT false,
  uniform_last_checked    DATE,
  uniform_notes           TEXT,

  notes                   TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE drivers ALTER COLUMN user_id DROP NOT NULL;

-- ── booking reference counter ───────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS booking_ref_seq START 1;

-- ── bookings ────────────────────────────────────────────────────────────────
-- One booking is one job for one customer, billed once. The cars that ran it
-- live in booking_vehicles.
--
-- status is only ever 'confirmed', 'completed' or 'cancelled'. Invoiced and
-- overdue are worked out from invoice_number and invoice_date.
CREATE TABLE IF NOT EXISTS bookings (
  id                      SERIAL PRIMARY KEY,
  booking_ref             TEXT UNIQUE NOT NULL,
  customer_id             INTEGER REFERENCES customers(id),

  service_type            TEXT,
  status                  TEXT DEFAULT 'confirmed',

  pickup_location         TEXT,
  pickup_region           TEXT,
  dropoff_location        TEXT,
  dropoff_region          TEXT,
  pickup_datetime         TIMESTAMPTZ,
  dropoff_datetime        TIMESTAMPTZ,
  return_datetime         TIMESTAMPTZ,

  travel_details          TEXT,
  notes                   TEXT,
  trip_notes              TEXT,

  -- money
  quoted_amount           DECIMAL(12,2),
  paid_amount             DECIMAL(12,2) DEFAULT 0,
  trip_cost               DECIMAL(12,2) DEFAULT 0,
  owner_payout_amount     DECIMAL(12,2),
  emergency_cost          DECIMAL(12,2) DEFAULT 0,
  emergency_notes         TEXT,

  -- invoicing
  invoice_number          TEXT,
  invoice_date            DATE,
  payment_status          TEXT DEFAULT 'unpaid',
  payment_method          TEXT,
  payment_received_date   DATE,
  km_travelled            DECIMAL(10,2),

  -- printed delivery note and tax invoice
  document_data           JSONB,

  -- legacy, no longer written
  trip_type               TEXT,
  driver_waited           BOOLEAN DEFAULT false,

  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ── cars on a booking ───────────────────────────────────────────────────────
-- A job can run on several cars. Each keeps its own driver and its own costs,
-- which is what makes per-vehicle profit honest.
CREATE TABLE IF NOT EXISTS booking_vehicles (
  id                      SERIAL PRIMARY KEY,
  booking_id              INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  vehicle_id              INTEGER REFERENCES vehicles(id),
  driver_id               INTEGER REFERENCES drivers(id),

  is_borrowed             BOOLEAN DEFAULT false,
  borrowed_vehicle_desc   TEXT,
  borrowed_owner_name     TEXT,
  borrowed_owner_phone    TEXT,
  borrowed_payout_type    TEXT,
  borrowed_payout_percent DECIMAL(5,2),
  borrowed_payout_fixed   DECIMAL(12,2),
  owner_payout_amount     DECIMAL(12,2),

  km_travelled            DECIMAL(10,2),
  fuel_cost               DECIMAL(12,2) DEFAULT 0,
  driver_allowance        DECIMAL(12,2) DEFAULT 0,
  emergency_cost          DECIMAL(12,2) DEFAULT 0,
  emergency_notes         TEXT,

  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ── expenses ────────────────────────────────────────────────────────────────
-- expense_type separates the three kinds the reports treat differently:
--   'trip'     — written by Record Invoice, always tied to a booking
--   'monthly'  — rent, umeme, salaries
--   'periodic' — insurance, licences, tax
CREATE TABLE IF NOT EXISTS expenses (
  id             SERIAL PRIMARY KEY,
  category       TEXT NOT NULL,
  description    TEXT,
  amount         DECIMAL(12,2) NOT NULL,
  currency       TEXT DEFAULT 'TZS',
  expense_date   DATE NOT NULL,
  expense_type   TEXT DEFAULT 'monthly',
  booking_id     INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
  period_months  INTEGER DEFAULT 1,
  next_due_date  DATE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── legacy ──────────────────────────────────────────────────────────────────
-- Written by the old driver portal, which no longer exists. Kept so historic
-- rows aren't lost; nothing reads or writes it now.
CREATE TABLE IF NOT EXISTS trip_assignments (
  id           SERIAL PRIMARY KEY,
  booking_id   INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
  driver_id    INTEGER REFERENCES drivers(id),
  vehicle_id   INTEGER REFERENCES vehicles(id),
  assigned_at  TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
