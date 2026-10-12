# Alpine Start

Live application: https://alpine-start.vercel.app. Private source repository: https://github.com/amarks98/alpine-start.

Plan when to leave so you finish exposed terrain before a storm cutoff and complete the route before nautical dusk minus your margin.

The app accepts a route as prose (one segment per line) or editable structured segments. It produces a departure time, a named turnaround/checkpoint deadline, an ordered per-segment clock, and the binding constraint: storm or darkness.

**Current status:** local production build and TypeScript checks pass; all **42 tests pass** against the local Supabase stack (33 unit/regression checks and 9 database checks). The selected hosted Supabase project is **amarks98's Casper Project** (`nobqwmdimnsiodzrrgcl`); its routes table has the date/description upgrade and four owner-only RLS policies. Production is deployed and its login page is verified. Hosted demo email confirmation and Vercel GitHub access are pending; see [DEPLOY.md](DEPLOY.md).

## Run locally

Requires Node.js 22 and Docker for local Supabase.

```bash
npm ci
npx supabase start
```

For a fresh local database, the CLI applies the files in `supabase/migrations/`. To recreate a disposable local database from those migrations:

```bash
npx supabase db reset --local
```

Reset deletes local users and data. Do not use it on a database you want to preserve. Existing local data was upgraded with the additive second migration; a destructive reset has not been run during the current verification.

Copy `.env.example` to `.env.local` and fill in the local API URL and anon key printed by `npx supabase status`. Create a confirmed demo user in local Supabase Studio and set `DEMO_EMAIL` and `DEMO_PASSWORD`, or use email/password sign-up.

```bash
npm run dev
```

A hosted Supabase project works too: use its URL and public anon/publishable key. The application never needs a service-role key. Deployment steps are in [DEPLOY.md](DEPLOY.md).

## Try the sample

1. Sign in or choose **Try the demo**, then **Add sample route**.
2. Open the Palisades Traverse. Select **July 15, 2026**, party size **2**, cutoff **14:00**, margin **60**.
3. The start is **02:48**, storm-bound, with a **14:00** checkpoint deadline at the end of **Rappels off the crest**.
4. Change party size to **3**: the start moves to **00:56**.
5. Restore party size to **2**, then set the cutoff to **17:00**: the start is **04:29**, dark-bound, with a **15:41** checkpoint deadline.
6. Save and reload: date, party size, cutoff, margin and segments survive.

The sample starts and ends at high camp; the UI's “Leave the car” heading should be read as departure from the route's starting point. The sample is illustrative, not a verified guidebook itinerary. Daylight depends on the selected date, so tomorrow's plan need not match July's figures.

## Describe a route

Open **Describe your route in prose** in the editor. For example:

```text
Approach: ascend 5 km on trail gaining 1000 m.
Ridge: ascend 2 pitches at 5.10b, exposed.
Rappels: descend 3 rappels, exposed.
Return: descend 5 km on trail losing 1000 m.
```

Choose **Preview segments**, review the parsed values, then **Use these segments**. This replaces the current segment list locally; Save persists it and the original prose. Unsupported or incomplete lines produce errors rather than invented distances. The parser is deterministic and expects the vocabulary shown above; it is not unrestricted natural-language interpretation.

Walking requires distance in km, vertical change in m, terrain and direction. Rope work defaults to one pitch/rappel. An omitted or unreadable pitch grade uses 45 minutes and is marked assumed. Parsed segments remain editable and reorderable.

## Planner model

All clock math uses local minutes since midnight; negative start times refer to the previous evening and trigger a bivy warning.

| Terrain | Model | Assumed rates |
| --- | --- | --- |
| Trail | `(km + verticalM / 100) / rate` hours | Up 4; down 6 |
| Off-trail | Same formula | Up 2; down 3 |
| Pitches | Minutes per pitch × party factor | 30 / 45 / 60 by grade band |
| Rappels | Minutes per rappel × party factor | 15 |

`partyFactor = 1 + 0.5 × max(0, partySize − 2)`, applied to rope work only.

Grades use numeric YDS parsing: `5.9 < 5.10a < 5.10b < 5.10c < 5.10d < 5.11a`. The three pitch-time bands are derived from that ordering; letter suffixes do not introduce additional time bands.

The checkpoint is the end of the last exposed segment, falling back to the last ascent segment. Let `throughCheckpoint` be elapsed time through it, `remaining` all segments after it, and `lastLight = nauticalDusk − margin`:

```text
start      = min(stormCutoff − throughCheckpoint, lastLight − totalTime)
checkpoint = min(stormCutoff,                     lastLight − remaining)
```

The ordered remainder includes later climbs and excludes earlier descents. On a there-and-back route the checkpoint is normally the summit. On a traverse it is a named point along the planned itinerary. **It is not a reverse-route bailout estimate.**

SunCalc supplies sunrise and nautical dusk. The route's timezone is derived from coordinates using `tz-lookup`; date-specific offsets handle DST. Missing dusk drops the darkness term and raises a warning. All pace rates and the 60-minute default margin are assumptions.

## Structure

- `lib/engine.ts`: pure planner, daylight and formatting.
- `lib/prose.ts`: prose-to-segment parser; `lib/dates.ts`: calendar-date validation.
- `lib/validation.ts`: persistence schemas and route types.
- `app/routes/[id]/RouteEditor.tsx`: local editing, prose preview and save.
- `app/routes/[id]/PlanPanel.tsx`: controls, deadlines and warnings.
- `app/actions.ts`: authentication and route mutations; saves verify a row was updated.
- `proxy.ts` and `lib/supabase/server.ts`: session handling.
- `supabase/migrations/`: ordered database migrations; `supabase/schema.sql`: equivalent SQL-editor setup.

Routes belong to their authenticated owner via four RLS policies. The selected plan date and original prose are persisted alongside segments and the three numeric controls. Existing routes without a date default to tomorrow in the route's timezone. Clearing a date keeps the last valid plan and displays a message.

`/` leads to `/login`; signed-in users continue to `/routes`. Missing or inaccessible route IDs return 404. The shared demo account has shared mutable routes.

## Verification

```bash
npm test
npm run typecheck
npm run build
```

Without database settings, 33 tests pass and 9 integration tests skip. To include the database checks against the local stack:

```bash
SB_URL=http://127.0.0.1:54321 SB_ANON=<local-anon-key> npm test
```

The database suite checks owner isolation, defaults, JSON round trips, persisted controls and constraints. Save-action regressions cover zero updated rows and invalid dates. Planner regressions cover grade ordering, interleaved traverses, checkpoint remainders and the sample's departure times.

Browser checks completed locally: demo login, route creation, prose preview/application, segment reordering, and save/reload persistence. Remaining acceptance checks and deployment status are recorded in [DEPLOY.md](DEPLOY.md).

## Next features

Trip logging and learned pace calibration, weather-driven cutoffs, GPX import, sharing and offline use remain unbuilt. The engine already accepts optional per-terrain pace factors. See [the architecture document](alpine-start-architecture.md) for the design.
