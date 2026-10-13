# Graph Report - alpine_start  (2026-10-13)

## Corpus Check
- 52 files · ~16,248 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 263 nodes · 492 edges · 16 communities (13 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3dd15577`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- engine.ts
- translation.ts
- package.json
- actions.ts
- Alpine Start
- prose.ts
- compilerOptions
- server.ts
- validation.ts
- Casper Engineering Take-Home
- dependencies
- AGENTS.md
- postcss.config.mjs
- tz-lookup.d.ts
- RouteEditor.tsx
- devDependencies

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 18 edges
2. `compilerOptions` - 17 edges
3. `vitest` - 14 edges
4. `PlanPanel()` - 12 edges
5. `RouteEditor()` - 11 edges
6. `next` - 10 edges
7. `Segment` - 9 edges
8. `buildPlan()` - 9 edges
9. `Alpine Start` - 8 edges
10. `Casper Engineering Take-Home` - 8 edges

## Surprising Connections (you probably didn't know these)
- `saveRoute()` --calls--> `createClient()`  [EXTRACTED]
  app/actions.ts → lib/supabase/server.ts
- `PlanPanel()` --calls--> `isPlanDate()`  [EXTRACTED]
  app/routes/[id]/PlanPanel.tsx → lib/dates.ts
- `render()` --indirect_call--> `PlanPanel()`  [INFERRED]
  lib/plan-panel.test.ts → app/routes/[id]/PlanPanel.tsx
- `signIn()` --calls--> `createClient()`  [EXTRACTED]
  app/actions.ts → lib/supabase/server.ts
- `signUp()` --calls--> `createClient()`  [EXTRACTED]
  app/actions.ts → lib/supabase/server.ts

## Import Cycles
- None detected.

## Communities (16 total, 3 thin omitted)

### Community 0 - "engine.ts"
Cohesion: 0.14
Nodes (20): daylight, gradeValue(), LETTER, MUNTER, num(), partyFactor(), Phase, PITCH_MIN (+12 more)

### Community 1 - "translation.ts"
Cohesion: 0.16
Nodes (17): mocks, output, translateWithBedrock(), applyDrafts(), draftProblems(), draftSchema, draftsSchema, extractDrafts() (+9 more)

### Community 2 - "package.json"
Cohesion: 0.08
Nodes (25): mocks, withAgentCoreTools(), name, private, scripts, build, dev, start (+17 more)

### Community 3 - "actions.ts"
Cohesion: 0.20
Nodes (19): ActionState, addSampleRoute(), createRoute(), deleteRoute(), field(), signIn(), signInDemo(), signOut() (+11 more)

### Community 4 - "Alpine Start"
Cohesion: 0.09
Nodes (20): AI integration (deferred), Architecture, Boundaries, Data and editing, Extensions, Scope decisions, Timing model, Acceptance (+12 more)

### Community 5 - "prose.ts"
Cohesion: 0.42
Nodes (7): ProseInput(), parse(), Segment, isConstrainedProse(), ParsedRoute, parseRouteProse(), PROSE_EXAMPLE

### Community 6 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 7 - "server.ts"
Cohesion: 0.18
Nodes (9): metadata, requiredEnv(), SUPABASE_ANON_KEY(), SUPABASE_URL(), nextConfig, config, proxy(), next (+1 more)

### Community 8 - "validation.ts"
Cohesion: 0.09
Nodes (15): POST(), isPlanDate(), mocks, payload, createRouteSchema, phaseSchema, ROUTE_COLUMNS, RouteRow (+7 more)

### Community 9 - "Casper Engineering Take-Home"
Cohesion: 0.18
Nodes (10): AI Tools, Casper Engineering Take-Home, Constraints, Deployment, Everything Else Is Up to You, Language, Objective, Submission (+2 more)

### Community 10 - "dependencies"
Cohesion: 0.14
Nodes (14): dependencies, ai, @ai-sdk/amazon-bedrock, @ai-sdk/mcp, @aws-sdk/credential-providers, next, react, react-dom (+6 more)

### Community 14 - "RouteEditor.tsx"
Cohesion: 0.15
Nodes (22): saveRoute(), clampMargin(), DayNote(), minutesFromTime(), PlanPanel(), Row(), WARNING_TEXT, isDistance() (+14 more)

### Community 15 - "devDependencies"
Cohesion: 0.25
Nodes (8): devDependencies, tailwindcss, @tailwindcss/postcss, @types/node, @types/react, @types/react-dom, typescript, vitest

## Knowledge Gaps
- **6 isolated node(s):** `@tailwindcss/postcss`, `@types/node`, `@types/react`, `@types/react-dom`, `tailwindcss` (+1 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 120 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `validation.ts` to `engine.ts`, `translation.ts`, `package.json`, `prose.ts`, `RouteEditor.tsx`?**
  _High betweenness centrality (0.119) - this node is a cross-community bridge._
- **What connects `@tailwindcss/postcss`, `@types/node`, `@types/react` to the rest of the system?**
  _6 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `engine.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13666666666666666 - nodes in this community are weakly interconnected._
- **Why does `next` connect `server.ts` to `package.json`, `actions.ts`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.07936507936507936 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Should `Alpine Start` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._