# Database

Neon PostgreSQL. Everything the app needs is in this folder.

## Files

| File | What it does |
|---|---|
| `schema.sql` | Creates every table, type and sequence. Safe to run against the live database — it only adds what's missing. |
| `indexes.sql` | Indexes for the queries the app runs often. Safe to re-run. |

## Rebuilding from nothing

Run `schema.sql` then `indexes.sql` in the Neon SQL editor. That gives an empty
but complete database.

## Working without touching Ray's data

Right now `.env.local` points at the production database, so every test booking
made on localhost is a real booking in the business.

Neon branches fix this and cost nothing:

1. Neon console → the project → **Branches** → **New Branch**
2. Name it `dev`, branch from `main`
3. Copy the connection string it gives you
4. Put that string in `.env.local` as `DATABASE_URL`

The branch starts as a copy of production, so there's real data to work with,
and nothing done on it reaches the live system. Delete and recreate it whenever
it drifts too far.

Vercel keeps using the production string from its own environment variables —
those are set in the Vercel dashboard, not in this file.

## Backups

Neon keeps a restore window on the main branch. Check the retention setting in
the console; the default is short on free plans. Before any migration that
drops or renames a column, take a branch first — that's an instant snapshot you
can go back to.

## Things worth knowing about the schema

**Status columns hold only what a person decides.** `vehicles.status` is
`available` or `maintenance`; `drivers.status` is `available` or `leave`.
`on_hire`, `booked` and `on_duty` are worked out from the bookings when read.
Writing them back would put two sources of truth in play.

**Booking status is `confirmed`, `completed` or `cancelled`.** Invoiced and
overdue come from `invoice_number` and `invoice_date`. A booking stays
`confirmed` until payment is received, however long that takes.

**A booking's cars live in `booking_vehicles`.** The columns on `bookings`
itself are roll-ups: `trip_cost` is the sum across the cars, and
`owner_payout_amount` the same for borrowed ones.

**`trip_assignments` is dead.** The old driver portal wrote it. Nothing reads
it now; it's kept so old rows aren't thrown away.
