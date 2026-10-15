# Working on Zuri

## The rule

**Never push straight to `main`.** `main` deploys to www.zuritours.co.tz the
moment it changes — there's no staging environment in between, and no one
reviews it first. A branch is the only checkpoint that exists.

## The flow

1. **Branch.**
   ```powershell
   git checkout -b fix/whatever-it-is
   ```

2. **Work and test on localhost**, ideally against the `dev` database branch
   (see `db/README.md`) so nothing touches Ray's real bookings.

3. **Push the branch.**
   ```powershell
   git push -u origin fix/whatever-it-is
   ```
   This triggers CI (`.github/workflows/ci.yml`) — it installs, lints, and
   runs a full `next build`. Check the Actions tab on GitHub; wait for the
   green check before doing anything else.

4. **Also check the Vercel preview.** Every branch gets its own preview URL
   automatically. CI passing means the code compiles; the preview URL is
   where you actually click through the feature.

5. **Only once both are green**, merge into `main`:
   ```powershell
   git checkout main
   git pull
   git merge fix/whatever-it-is
   git push
   ```

6. Watch the Vercel deployment for `main` reach **Ready**, then check
   www.zuritours.co.tz for real.

## Why this matters here specifically

Every fix so far has gone through a phase of "build error → paste the log →
fix → rebuild." That loop is fine on a branch. It's expensive on `main`,
because each failed build is a broken production deploy, even if only for a
few minutes.

## Database migrations

Any SQL that changes the schema goes in `db/schema.sql` (or a new file in
`db/`) in the same commit as the code that needs it, not just pasted into the
Neon console and forgotten. The console is for running it; the repo is the
record of what changed and why.
