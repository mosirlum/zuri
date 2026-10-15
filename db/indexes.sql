-- ============================================================================
-- Indexes
--
-- One per query the app runs often. Safe to re-run.
-- ============================================================================

-- Every page that asks "who is out today" walks booking_vehicles by booking,
-- by vehicle and by driver.
CREATE INDEX IF NOT EXISTS booking_vehicles_booking_idx ON booking_vehicles (booking_id);
CREATE INDEX IF NOT EXISTS booking_vehicles_vehicle_idx ON booking_vehicles (vehicle_id);
CREATE INDEX IF NOT EXISTS booking_vehicles_driver_idx  ON booking_vehicles (driver_id);

-- The busy window and the clash check both filter on live bookings by date.
CREATE INDEX IF NOT EXISTS bookings_pickup_idx ON bookings (pickup_datetime);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings (status);
CREATE INDEX IF NOT EXISTS bookings_customer_idx ON bookings (customer_id);

-- Outstanding invoices and the overdue flag.
CREATE INDEX IF NOT EXISTS bookings_invoice_idx ON bookings (invoice_number) WHERE invoice_number IS NOT NULL;

-- Reports and Finance slice expenses by date, then by kind.
CREATE INDEX IF NOT EXISTS expenses_date_idx ON expenses (expense_date);
CREATE INDEX IF NOT EXISTS expenses_booking_idx ON expenses (booking_id);
CREATE INDEX IF NOT EXISTS expenses_type_idx ON expenses (expense_type);

-- Compliance sorts every document by how soon it expires.
CREATE INDEX IF NOT EXISTS vehicles_insurance_idx ON vehicles (insurance_expiry);
CREATE INDEX IF NOT EXISTS drivers_license_idx ON drivers (license_expiry);

-- Login looks the user up by email on every sign-in.
CREATE INDEX IF NOT EXISTS users_email_idx ON users (LOWER(email));

-- Customers are matched on phone when a booking is created.
CREATE INDEX IF NOT EXISTS customers_phone_idx ON customers (phone);
