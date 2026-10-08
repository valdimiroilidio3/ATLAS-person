# ATLAS — Personal AI Command Center

> **Intent → Context → Strategy → Agents → Execution → Results → Learning**

ATLAS is a premium personal AI operating system that turns goals and intentions into
measurable execution. It is not a dashboard, a task manager, or a chatbot — it is a
command center that continuously answers one question:

> **What is the highest-value thing the user should do next?**

And its most important action is: **EXECUTE.**

## Run it

```bash
npm install
npm run dev        # development server
npm run build      # production build
npm start          # serve the production build
npx tsx scripts/test-engine.ts   # engine state-machine tests (45 checks)
```

Open [http://localhost:3000](http://localhost:3000). Press **⌘K / Ctrl+K** for the
command bar.

## What it does

- **Home / Command Center** — greeting, Ask ATLAS (natural-language → structured plan),
  TODAY (what needs attention), NEXT BEST ACTION (the single most important component),
  MOMENTUM (goal progression with honest actual / projected / target labels),
  agents · radar · activity snapshot.
- **Next Best Action** — derived live from state (prospect queue → blockers → catalog →
  SEO). **Execute** opens a preview of the full plan, then runs it through a real
  state machine: `thinking → preparing → executing → waiting-approval → completed/blocked`.
- **Goals** — objective, target, current, deadline, assumptions, strategy, milestones,
  risks, next actions, AI recommendation. Progress is computed, never hardcoded.
- **Projects** — ORBITA 82% · SCOUT 64% · WEAF 91%, derived from milestone state.
- **Agents** — SCOUT, RESEARCH, CONTENT, SEO, EXECUTION, DEPLOYMENT. Each has a purpose,
  status, current task, tools, permission level, activity, results and errors.
- **Execution Center** — mission control. Distinguishes thinking, preparing, executing,
  user approval, blocked and completed — with reasons and next actions.
- **Approval Center** — permission architecture L0–L4. Sending messages, publishing,
  deploying and spending require approval. Nothing executes silently.
- **Radar** — opportunities, risks, signals, trends, blockers. Every insight explains
  *why it matters* and *what ATLAS recommends*.
- **Activity** — chronological, virtualized feed with daily summaries.
- **Memory** — goals, projects, preferences, skills, decisions, important context.
- **Settings** — profile, preferences, 8 integrations (honestly NOT CONNECTED),
  permission levels, demo-data reset.

## Architecture

```
lib/atlas/
  types.ts      Full data model: User · Goal · Project · Task · Agent · AgentRun ·
                Memory · Insight · Opportunity · Approval · Integration · Activity ·
                Metric · Milestone · Strategy
  seed.ts       Realistic, time-relative seed state (ORBITA, SCOUT, WEAF, Chelton)
  engine.ts     Pure state machine: intent interpreter, next-best-action derivation,
                execution plans, run lifecycle, approvals, toasts
  store.tsx     React context: persistence (localStorage), run clock, ambient life,
                global UI state (palette, approvals, execution flow)
  constants.ts  Permission levels, status meta, navigation
  format.ts     Currency, dates, relative time
```

**The data layer is clean by design.** Components never touch mock data directly —
they call store actions; the engine computes the next state. Swap `seed.ts` +
`store.tsx` persistence for real APIs and AI agents without touching the UI.

**Honesty rules.** No fake integrations (unconnected ones say NOT CONNECTED and open
an adapter-boundary modal). No fake execution: external steps block with a reason and
a *Connect* action until an integration exists. No fabricated financials: momentum
labels actual vs projected vs target and attributes everything to user assumptions.

## Design

Graphite near-black canvas, hairline borders, elevated surfaces, Inter + JetBrains
Mono, one restrained amber accent. Color communicates state (success / warning / error /
active) — never decoration. Spring-based motion, layout transitions, reduced-motion
support. Keyboard-first: ⌘K, arrows, Enter, Esc. Semantic HTML, focus-visible states,
ARIA on dialogs.

## Security posture

Least-privilege permission levels (L0 observe → L4 autonomous), approval boundaries
for sensitive actions, no API keys client-side, no credentials in frontend state,
audit trail in Activity.
