# Deployment and acceptance checks

## Current state

The chosen hosted project is **amarks98's Casper Project**, ref `nobqwmdimnsiodzrrgcl`. Its original Alpine Start routes schema was already present. The additive date/description upgrade has been applied through the SQL editor, and RLS plus all four owner-only policies were verified there.

Production is deployed at https://alpine-start.vercel.app. Source is in the private repository https://github.com/amarks98/alpine-start. The production login page is verified. Demo credentials were supplied through the ignored environment file and deployed; Supabase currently returns `Email not confirmed` for that account. Its email confirmation is pending. Vercel GitHub App access is also pending, so the initial deployment used the CLI.

Production values are prepared in `.env.production.local`, which is ignored by Git and readable only by the file owner. Do not commit it, `.env.local`, or `.vercel/`.

## Database migrations

The source of truth is the ordered migration chain:

1. `20261012000100_initial_routes.sql`: original table, index, constraints and four owner policies.
2. `20261012000200_plan_date_and_description.sql`: additive saved-date and prose columns.

The nonexistent seed-file reference has been removed from `supabase/config.toml`. Fresh local starts/reset use the migrations, not the standalone `schema.sql` file.

```bash
npx supabase start
```

Only for a disposable local database:

```bash
npx supabase db reset --local
```

A reset removes local users and data. The current local stack was upgraded additively; reset verification has not been performed because permission for that verification command was declined.

For a new hosted project, use the [Supabase migration workflow](https://supabase.com/docs/guides/local-development/database-migrations). For an existing project, inspect migration history and capture any remote-only schema before pushing. The selected project's schema was installed through the dashboard, so its migration history still needs baselining before future automated `db push` use. Do not blindly mark unrelated migrations as applied.

`supabase/schema.sql` provides equivalent idempotent SQL-editor setup. On an existing Alpine Start schema, the second migration alone adds the new columns without changing route data or policies.

## Production environment

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://nobqwmdimnsiodzrrgcl.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project public anon/publishable key |
| `DEMO_EMAIL` | Confirmed demo account supplied by the owner |
| `DEMO_PASSWORD` | Demo user's password; server-only |

The service-role key is not required by the application and must not be deployed.

Email/password sign-up displays confirmation instructions when Supabase does not issue a session. On a shared project, preserve its existing auth policy unless the owner authorizes changing it; confirmed accounts can still sign in. Confirm the demo user individually rather than weakening the whole project's settings just for the demo.

## Vercel

Deploy from the private GitHub repository once pushed. Use Next.js framework detection, the repository root, and the four production variables above. A CLI deploy is also supported:

```bash
npx vercel login
npx vercel link
npx vercel --prod
```

See [Vercel deploy documentation](https://vercel.com/docs/cli/deploy). A successful build is not sufficient: verify the running app against hosted Supabase.

Set Supabase's Site URL to the chosen production URL and configure permitted redirect URLs when using confirmation, password recovery or OAuth flows. These settings control authentication redirect destinations; they do not determine the origin of the application's SSR session cookie. See [Supabase redirect documentation](https://supabase.com/docs/guides/auth/redirect-urls).

## Acceptance checks

Use a fresh browser session for the deployment checks. Local results so far:

- [x] Demo password login reaches the routes list.
- [x] Route creation derives `America/Los_Angeles` from Sierra coordinates.
- [x] July sample departure: party 2 / cutoff 14:00 / margin 60 → 02:48, storm-bound.
- [x] Party 3 → 00:56.
- [x] Restore party 2 / cutoff 17:00 → 04:29, dark-bound; checkpoint 15:41.
- [x] Save and reload retain the selected date and cutoff.
- [x] Prose preview parses four segments; application, reordering and save/reload work.
- [ ] Mobile layout check at 390px (browser override retained a 662px viewport; narrower width remains unverified).
- [x] Sign out; protected routes lead to login.
- [x] Another user's route returns 404 in the browser (database isolation tests pass).
- [ ] Hosted deployment: repeat all applicable checks with production credentials.

For the exact figures above, explicitly select **July 15, 2026**, margin **60**, and reset party size to **2** before the 17:00-cutoff case. The editor otherwise defaults to a saved date or tomorrow, so its daylight figures will differ.

## Remaining operational work

Finish hosted demo acceptance after email confirmation, connect Vercel GitHub App access for automatic deploys, and baseline remote migration history before automated database pushes. Keep future database changes in migrations. Trip logging, calibrated rates and offline use remain separate follow-up features.
