# Graph Report - alpine_start  (2026-10-13)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 287 nodes · 520 edges · 15 communities (11 shown, 4 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `189a82a3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- engine.ts
- Alpine Start
- package.json
- validation.ts
- actions.ts
- RouteEditor.tsx
- compilerOptions
- server.ts
- dependencies
- Casper Engineering Take-Home
- vitest
- Deferred AI-assisted route intake
- AGENTS.md
- postcss.config.mjs
- tz-lookup.d.ts

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 18 edges
2. `compilerOptions` - 17 edges
3. `vitest` - 14 edges
4. `PlanPanel()` - 12 edges
5. `Alpine Start` - 12 edges
6. `RouteEditor()` - 11 edges
7. `next` - 10 edges
8. `Segment` - 9 edges
9. `buildPlan()` - 9 edges
10. `Casper Engineering Take-Home` - 8 edges

## Surprising Connections (you probably didn't know these)
- `render()` --indirect_call--> `PlanPanel()`  [INFERRED]
  lib/plan-panel.test.ts → app/routes/[id]/PlanPanel.tsx
- `RouteEditor()` --calls--> `buildPlan()`  [EXTRACTED]
  app/routes/[id]/RouteEditor.tsx → lib/engine.ts
- `RouteEditor()` --calls--> `formatClock()`  [EXTRACTED]
  app/routes/[id]/RouteEditor.tsx → lib/engine.ts
- `addSampleRoute()` --calls--> `dateInZone()`  [EXTRACTED]
  app/actions.ts → lib/engine.ts
- `createRoute()` --calls--> `dateInZone()`  [EXTRACTED]
  app/actions.ts → lib/engine.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Deferred model and tool-assisted route intake** — readme_ai_route_intake, readme_route_link_imports, alpine_start_architecture_bedrock_adapter, alpine_start_architecture_agentcore_connector, alpine_start_architecture_ai_enablement [EXTRACTED 1.00]
- **Implemented edit-plan-save loop** — alpine_start_architecture_route_editor, alpine_start_architecture_timing_model, alpine_start_architecture_server_actions, alpine_start_architecture_supabase_rls [EXTRACTED 1.00]

## Communities (15 total, 4 thin omitted)

### Community 0 - "engine.ts"
Cohesion: 0.09
Nodes (37): clampMargin(), DayNote(), minutesFromTime(), PlanPanel(), Row(), WARNING_TEXT, isPlanDate(), buildPlan() (+29 more)

### Community 1 - "Alpine Start"
Cohesion: 0.05
Nodes (31): AI integration (deferred), Architecture, Boundaries, Data and editing, Nautical dusk and route-timezone calculations, Incomplete drafts and same-tab recovery, Extensions, Route editor and plan panel (+23 more)

### Community 2 - "package.json"
Cohesion: 0.06
Nodes (31): mocks, withAgentCoreTools(), devDependencies, tailwindcss, @tailwindcss/postcss, @types/node, @types/react, @types/react-dom (+23 more)

### Community 3 - "validation.ts"
Cohesion: 0.10
Nodes (27): mocks, output, translateWithBedrock(), Segment, applyDrafts(), draftProblems(), draftSchema, draftsSchema (+19 more)

### Community 4 - "actions.ts"
Cohesion: 0.20
Nodes (18): ActionState, addSampleRoute(), createRoute(), deleteRoute(), field(), signIn(), signInDemo(), signOut() (+10 more)

### Community 5 - "RouteEditor.tsx"
Cohesion: 0.17
Nodes (18): saveRoute(), RoutePage(), ProseInput(), parse(), isDistance(), numOrUndefined(), RouteEditor(), TERRAIN_LABEL (+10 more)

### Community 6 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 7 - "server.ts"
Cohesion: 0.18
Nodes (9): metadata, requiredEnv(), SUPABASE_ANON_KEY(), SUPABASE_URL(), nextConfig, config, proxy(), next (+1 more)

### Community 8 - "dependencies"
Cohesion: 0.14
Nodes (14): dependencies, ai, @ai-sdk/amazon-bedrock, @ai-sdk/mcp, @aws-sdk/credential-providers, next, react, react-dom (+6 more)

### Community 9 - "Casper Engineering Take-Home"
Cohesion: 0.18
Nodes (10): AI Tools, Casper Engineering Take-Home, Constraints, Deployment, Everything Else Is Up to You, Language, Objective, Submission (+2 more)

### Community 11 - "Deferred AI-assisted route intake"
Cohesion: 0.38
Nodes (6): JWT-authorized AgentCore Gateway MCP connector, AI provisioning and authorization prerequisites, Deferred Bedrock structured-extraction adapter, Vercel AI SDK Amazon Bedrock provider, Deferred AI-assisted route intake, Deferred CalTopo and AllTrails imports

## Knowledge Gaps
- **13 isolated node(s):** `tailwindcss`, `@tailwindcss/postcss`, `@types/node`, `@types/react`, `@types/react-dom` (+8 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 128 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `vitest` to `engine.ts`, `package.json`, `validation.ts`, `actions.ts`, `RouteEditor.tsx`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **What connects `tailwindcss`, `@tailwindcss/postcss`, `@types/node` to the rest of the system?**
  _13 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `engine.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08603145235892692 - nodes in this community are weakly interconnected._
- **Why does `next` connect `server.ts` to `package.json`, `actions.ts`, `RouteEditor.tsx`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Should `Alpine Start` be split into smaller, more focused modules?**
  _Cohesion score 0.05384615384615385 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06417112299465241 - nodes in this community are weakly interconnected._