# Deployment

Production: https://alpine-start.vercel.app
Supabase: **amarks98's Casper Project** (`nobqwmdimnsiodzrrgcl`)

Production demo login and route viewing are verified. Local UX polish and parser changes still require deployment and hosted acceptance. AI remains disabled; no AI key is required.

## Environment

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://nobqwmdimnsiodzrrgcl.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon/publishable key |
| `DEMO_EMAIL` | Confirmed demo user's email |
| `DEMO_PASSWORD` | Demo password; server-only |

Keep `.env.local`, `.env.production.local`, and `.vercel/` out of Git. Do not deploy a service-role key. Set Supabase's Site URL to the production URL and configure redirect URLs for enabled auth flows. Sign-up requests email confirmation when required by the project's auth policy.

## Database

`supabase/migrations/` is the source of truth:

1. Initial routes table, constraints, and four owner-only RLS policies.
2. Saved date and description.
3. Inactive AI quota prototype: 20/account and 100/global attempts per UTC day.

Fresh local stacks apply migrations through `npx supabase start`. `supabase/schema.sql` is the SQL-editor alternative. To recreate a **disposable** local database, use `npx supabase db reset --local`; this deletes local users and data. Fresh-reset verification remains outstanding.

Hosted schema changes were applied through the dashboard. Baseline migration history and preserve remote-only changes before using automated `db push`. Existing quota tables can remain while AI is deferred.

## Deploy

Use the repository root, Next.js framework detection, and the environment above in Vercel. The GitHub connection is configured. CLI alternative:

```bash
npx vercel login
npx vercel link
npx vercel --prod
```

## Acceptance

Local checks have covered demo login, creation, sample calculations, parsing, reordering, persistence, protected routes, and owner isolation. The polished editor was checked at 390px without horizontal overflow; missing distance hides the plan and segment clocks. TypeScript and a Webpack production build passed.

Repeat on the deployed revision in a fresh browser session:

- [ ] Demo login, route creation, and sample values from [README](README.md#try-the-sample).
- [ ] Prose preview/application, reorder, save, and reload.
- [ ] Empty/incomplete routes hide recommendations.
- [ ] Unsaved-edit warning, same-tab recovery, and deletion cancellation.
- [ ] Phone layout at 390px and keyboard navigation.
- [ ] Sign-out protects routes; another user's route returns 404.
- [ ] AI endpoint returns 501; the local parser still works.
