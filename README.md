# Alpine Start

[Live app](https://alpine-start.vercel.app) · [Source](https://github.com/amarks98/alpine-start)

A departure planner for alpine climbers: finish exposed terrain before a storm cutoff and complete the route before nautical dusk minus a margin. Edit a route to see departure time, checkpoint deadline, segment clocks, and whether storms or darkness set the schedule.

## What works

- Email/password authentication and **Try the demo**. Demo users share mutable routes.
- Route creation, segment editing/reordering, and confirmed deletion.
- Local prose parsing using the example format below.
- Live planning with saved date, party size, deadlines, segments, and description.
- Incomplete-route drafts, unsaved-edit warnings, and best-effort recovery in the same browser tab.

**Status:** local submission polish awaits deployment. This checkout includes work after the original two-hour implementation. AI translation and route-link imports are deferred.

## Run locally

Requires Node.js 22 and Docker for local Supabase.

```bash
npm ci
npx supabase start
cp .env.example .env.local
```

Fill in the Supabase URL and public anon key from `npx supabase status`. For demo access, create a confirmed user in Supabase Studio and set `DEMO_EMAIL` and `DEMO_PASSWORD`; otherwise use sign-up.

```bash
npm run dev
```

A hosted Supabase project also works. No service-role or AI key is needed. See [deployment](DEPLOY.md) for schema setup and hosting.

## Try the sample

1. **Try the demo → Add sample route**.
2. Set **July 15, 2026**, party **2**, cutoff **14:00**, margin **60**: departure **02:48**, storm-bound; checkpoint **14:00** at **Rappels off the crest**.
3. Change party to **3**: departure **00:56**.
4. Restore party **2**, then set cutoff **17:00**: departure **04:29**, dark-bound; checkpoint **15:41**.
5. Save and reload to verify persistence.

The illustrative Palisades route starts and ends at high camp. Different dates produce different daylight times.

## Enter a route

Edit segments directly, or open **Describe your route in prose**:

```text
Approach: ascend 5 km on trail gaining 1000 m.
Ridge: ascend 2 pitches at 5.10b, exposed.
Rappels: descend 3 rappels, exposed.
Return: descend 5 km on trail losing 1000 m.
```

Choose **Preview segments → Use these segments**, confirm replacement, then **Save**. **Use example** fills the example above.

Use one named segment per line. Walking requires km and vertical m (`0 m` for flat ground). Rope counts default to one; missing/unreadable pitch grades use 45 minutes. Exposure defaults to false—review it explicitly. Parsing runs in the browser; free-form paragraphs, imperial extraction, and URLs are unsupported.

## Planning assumptions

Times use assumed Munter walking rates, grade-based pitch times, and 15 minutes per rappel. Party size scales rope work only. The storm cutoff is entered manually; breaks, route-finding, and transitions are not modeled separately. Allow for them when planning. Empty or incomplete routes show no recommendation.

The checkpoint is the end of the last exposed segment, or the last ascent. Its deadline follows the remaining itinerary; **it is not a reverse-route bailout estimate**. Negative departure times mean starting the previous evening. Missing dusk removes the darkness constraint and raises a warning.

See [architecture](alpine-start-architecture.md) for formulas and code structure.

## Verify

```bash
npm test
npm run typecheck
npm run build
# Alternative when Turbopack is restricted:
npm run build -- --webpack
```

Include local database checks with:

```bash
SB_URL=http://127.0.0.1:54321 SB_ANON=<local-anon-key> npm test
```

Tests cover planner calculations, parsing, validation, persistence, and the disabled AI endpoint. Database tests skip without local settings. Hosted acceptance remains in [DEPLOY.md](DEPLOY.md).

## Next: AI-assisted route intake

- **Free-form translation:** Vercel AI SDK with `@ai-sdk/amazon-bedrock` for model inference, plus Amazon Bedrock AgentCore Gateway tools over MCP. Supabase remains the auth/data layer.
- **CalTopo / AllTrails links:** import accessible route data into reviewable drafts, with GPX upload as a fallback where supported access requires it.
- **Review and controls:** source references, unit conversion, missing-data prompts, authenticated quotas, timeouts, and clear failures.

AI is disabled: `/api/translate` returns 501. The Bedrock adapter, AgentCore tool connector, and quota migration are deferred groundwork. Trip logging, learned pace calibration with predicted-vs-actual comparisons, weather-based cutoffs, sharing, and offline use are also unbuilt.

See [AI integration](alpine-start-architecture.md#ai-integration-deferred) for configuration and remaining work.
