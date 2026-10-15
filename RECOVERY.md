# If something breaks

Read this when something is actually wrong — not before. Each section is
independent; jump to the one that matches what happened.

## The site is down / showing errors to Ray right now

1. Check **Vercel → Deployments**. If the latest one shows a red X, that's
   almost certainly it — a broken deploy went out.
2. Click **Instant Rollback** on the last known-good deployment. This takes
   effect in seconds and needs no code changes.
3. Fix the problem on a branch afterwards, following `CONTRIBUTING.md`. Don't
   fix it directly on `main` under pressure — that's how the next outage gets
   made.

## Someone deleted a booking / vehicle / driver they shouldn't have

Deletes in this app are permanent — there's no undo button. Recovery means
going to the database.

1. Neon console → **main** branch → **Restore** (point-in-time recovery).
2. Pick a timestamp from just before the deletion. Neon shows you the data at
   that moment without touching the live branch yet.
3. If it looks right, either restore it directly or create a new branch from
   that point in time and pull the specific rows back out with SQL, then
   re-insert them into `main`. The second option is safer if other changes
   happened after the deletion that you don't want to lose.
4. Check the retention window in Neon's settings — free plans keep a short
   history. If the deletion happened outside that window, it's gone.

## The database itself is gone or corrupted

1. Create a fresh Neon project/branch.
2. Run `db/schema.sql` then `db/indexes.sql` from this repo — that rebuilds
   every table from nothing.
3. Restore data from the most recent Neon backup/branch you have, or accept
   that Zuri starts again from an empty database if none exists.
4. Update `DATABASE_URL` in Vercel's environment variables to point at the
   new database, then redeploy.

## An invoice was recorded with the wrong numbers

This isn't a disaster — it's editable.

1. The booking's stage is "Invoiced" or "Overdue" — open **Record Invoice**
   again on that booking and correct the figures. Saving replaces the old
   trip expenses with the corrected ones; nothing doubles up.
2. If it's already "Completed" (paid), there's currently no built-in way to
   reopen it. Fix the numbers directly with SQL against the `bookings` and
   `expenses` tables, matching on `booking_ref`.

## A password is forgotten or an account is locked out

- **Forgotten password**: Ray resets it from **Users** — there's a "Reset
  Password" field on the edit form.
- **Account locked (5 failed attempts)**: it clears itself after 15 minutes,
  or Ray can clear it immediately with:
  ```sql
  UPDATE users SET failed_attempts = 0, locked_until = NULL
  WHERE email = 'the-persons-email@zuritours.co.tz';
  ```

## General principle

Nothing in this app currently has a true "undo." The two things that make
mistakes recoverable are Neon's point-in-time restore and the fact that the
schema itself lives in `db/schema.sql` rather than only in someone's memory.
Both depend on the Neon retention window actually covering the time since the
mistake — the sooner a problem is noticed, the more likely it's still inside
that window.
