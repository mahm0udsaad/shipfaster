# Section 18: Product Feature Critique and Improvements
*(Regenerated with the full skills pack: Market Research Validator, Competitor Intelligence, Feature Critique, ICP Interview Designer, GTM Strategy, Agent Role Designer, MCP Tool Designer, MCP Tool Description Writer, Context Pack Architect, Project Memory Designer, Next.js SaaS Architect, Supabase Architect, Security & Permissions, UX Information Architecture, QA/Evaluation, Pricing & Packaging.)*

> Premise: ship-faster's user is a solo freelancer / small agency running 5–8 concurrent client projects where the *scarce resource is context, not task tracking*. The wedge is: **a PM tool where AI agents are first-class workers — they receive curated context and report structured work back, under an explicit permission model.**
>
> Structural decision (unchanged, reinforced by the competitor analysis below): **ship-faster does not host worker agents.** Claude Code / Cursor sessions are the workers; ship-faster is the coordination layer — Context Packs out, Session Logs in, one hosted Project Lead Agent, everything gated by an Approvals inbox.

## 18.0 Market & Competitor Reality Check
*(Market Research Validator + Competitor Intelligence)*

| Product | Agent-native? | Serves curated context to agents? | Agent permissions/approvals? | Freelance money-awareness? | Threat level |
|---|---|---|---|---|---|
| **Jira** | No (automation rules ≠ agents) | No | No | No | Low — enterprise ceremony is the anti-ICP |
| **Asana / ClickUp** | AI features for humans (summaries, AI fields) | No | No | ClickUp partially (time/invoice add-ons) | Low–medium |
| **Notion** | Notion AI + MCP server exists | Raw pages, not curated packs | No | No (DIY templates) | Medium — "DIY project brain" is the incumbent behavior |
| **GitHub Projects** | gh API/MCP; Copilot coding agent can take issues | Repo context only, no client/business context | Repo permissions only | No | Medium — for pure-code tasks |
| **Linear** | **Yes — agents as assignable teammates (Cursor, Copilot, etc.), official MCP** | No — agents get the issue, not a briefed pack | Workspace-level, coarse | No | **High — closest structural competitor** |
| **Dart (itsdart.com)** | Yes — AI PM that plans and executes tasks | Partially (its own agent) | Coarse | No | **High on "AI PM" positioning** |
| **APM-style AI PM tools** *(assuming the AI-project-manager category the list refers to)* | Yes | Own agents only | Varies | No | Medium |

**The honest conclusion:** "has MCP" and "agents can be assigned issues" are no longer differentiators — Linear already ships both. The defensible wedge is the *combination* none of them have:

1. **Context Packs** — a briefed, token-budgeted, task-specific context bundle (Linear hands the agent an issue; ship-faster hands it the project's brain).
2. **Session Logs → Brain loop** — agent work compounds into project memory instead of evaporating.
3. **Role-scoped permissions + Approvals inbox** — agents operate under explicit contracts, auditable per action.
4. **Freelance/agency money-awareness** — milestones with amounts, "what's owed across clients," client comms intake. Linear/Dart will not build this; it's beneath their market.

**Validation plan before building the sellable version** (do these, don't assume):
- Landing page + waitlist testing the one-line claim *"Your coding agents, briefed"* — target: 100 signups from Claude Code/Cursor communities before writing multi-user code.
- 10 ICP interviews (kit in §18.0b). Kill criterion: if fewer than 4/10 currently paste project context into agent sessions by hand, the Context Pack pain is imagined.
- Willingness-to-pay probe in interviews (Van Westendorp-lite: "at what monthly price is this a no-brainer / expensive / suspicious?").

## 18.0b ICP and Interview Kit
*(ICP Interview Designer)*

**Primary ICP:** solo freelance developers and 2–10-person dev agencies who (a) run ≥3 concurrent client projects, (b) already use AI coding agents daily, (c) receive work through informal channels (WhatsApp/email/calls). **Secondary:** AI builders orchestrating multiple agents who need a shared task/memory substrate. **Not the ICP (v1):** enterprises, non-technical PMs, single-project founders.

Interview questions (30 min, one sitting):
1. Walk me through yesterday: how many client projects did you touch, and how did you decide what to work on?
2. When you start a Claude Code/Cursor session on a client project, what do you paste or explain before it's useful? How long does that take?
3. Where do decisions made mid-session end up? Show me where "we decided X with the client" lives today.
4. Tell me about the last time an agent (or you) redid work because context was lost.
5. How do you track what each client owes you right now? Show me.
6. How does a WhatsApp message from a client become a task? Show me the last one.
7. Have you tried Linear's agent assignment / Dart / Notion AI for this? What broke?
8. If a tool briefed your agents automatically and filed their work reports back, what would you pay monthly? At what price is it a no-brainer? Expensive? Suspiciously cheap?
9. What would an agent have to do wrong exactly once for you to uninstall this?
10. Who else do you know who runs client work through AI agents like you do? *(referral + market-size signal)*

## 18.1 Features to keep as-is

| Feature | Why it stays |
|---|---|
| **Projects / Clients / Tasks / Milestones core** | Money-aware task tracking across clients is table stakes for the ICP and absent from all competitors above. Milestones carry amounts and pending/invoiced/paid state. |
| **MCP server** | This *is* the product — humans (dashboard) and agents (MCP) share one DB. Tool surface shrinks to 12 (§18.3) with descriptions engineered per §18.3b. |
| **Project Brain** | The main product feature. Structured per-project memory: decisions, conventions, environment, current state, client notes. Competitors treat context as pages nobody reads; here it's the substrate agents run on. |
| **Activity log** | Append-only, human+agent writes, agent-stamped. This is what makes agent work auditable — without it the security story (§18.13) collapses. |

## 18.2 Features to rename

| Old name | New name | Why |
|---|---|---|
| Account Manager Agent + PM Agent | **Project Lead Agent** (merged) | For a solo freelancer there's no boundary between account and project management — both reduce to triage, honest plans, drafted client updates. Two agents = two prompts, two permission models, permanent ambiguity about ownership. Merge for MVP. |
| Memory Agent | **Brain Sync** (system workflow, invisible) | Users should never "talk to" memory. Memory maintenance is deterministic: session log → summarize → diff proposal → approval → merge. Your hypothesis was right; confirmed. |
| Context Pack Generator | **Context Pack** (the Brain's export function) | One MCP tool on the Brain (`get_context_pack`), not a separate feature. The *pitch* still leads with it — "your agent starts every session already briefed" — but in the product it's one concept, not two. |
| Agent Skills | *(delayed — no rename yet)* | See §18.5. |

## 18.3 Features to simplify — MCP tool surface
*(MCP Tool Designer)*

Start with **12 tools**, not 30. Every tool is a permission decision, a docs page, and an attack surface. Design rules: verb-first names; consistent `project_id`/`task_id` params everywhere; every mutating tool returns the mutated object plus an `activity_id`; every tool declares side effects; errors are typed (`NOT_FOUND`, `FORBIDDEN_FOR_ROLE`, `APPROVAL_REQUIRED`) so agents can react instead of retrying blindly.

| # | Tool | Kind | One-line charter |
|---|---|---|---|
| 1 | `list_projects` | read | Enumerate projects visible to this token, with status and open-task counts |
| 2 | `get_project` | read | One project: milestones, money summary, health flags |
| 3 | `get_context_pack` | read | **The flagship.** Token-budgeted briefing for a project/task (spec in §18.10) |
| 4 | `list_tasks` | read | Filterable tasks (project, status, assignee, due) |
| 5 | `create_task` | write | New task or subtask; requires acceptance criteria for agent-assignable tasks |
| 6 | `update_task` | write | Status/priority/due/assignee within the caller's role limits |
| 7 | `add_comment` | write | Threaded comment on a task |
| 8 | `log_session` | write | Structured end-of-session work report (schema in §18.6) |
| 9 | `get_brain` | read | Current brain sections + version for a project |
| 10 | `propose_brain_update` | write (staged) | Diff proposal → Approvals inbox; never a direct write |
| 11 | `request_approval` | write (staged) | Put any proposed action in front of the human |
| 12 | `search` | read | One endpoint across tasks, brain, activity |

Human-only in the dashboard (deliberately *not* MCP tools in MVP): client CRUD, milestone/money mutation, task deletion, approval resolution, agent/token management, any outbound messaging.

## 18.3b MCP tool descriptions are a product feature, not documentation
*(MCP Tool Description Writer — per arXiv:2602.14878, "MCP Tool Descriptions Are Smelly": vague purpose, undeclared side effects, missing when-to-use guidance, and inconsistent naming measurably degrade agent tool selection and efficiency.)*

Every ship-faster tool description follows this template — treat it as a lint rule in CI:

```
<Verb phrase — what it does in one sentence.>
Use when: <the trigger situation, from the agent's point of view>.
Do NOT use when: <the common wrong reach, and the right tool instead>.
Side effects: <none | exactly what is written, and that it's logged/attributed>.
Returns: <shape, including ids the agent will need next>.
Errors: <typed errors and what the agent should do about each>.
```

Worked example — `get_context_pack`:

> Assemble a briefing for work on a project or a specific task: brain sections, the focused task's thread and acceptance criteria, related open tasks, and recent activity, trimmed to `token_budget` by fixed priority.
> **Use when:** starting any work session, before reading tasks individually — this is cheaper and more complete than calling `get_brain` + `list_tasks` + `get_project` separately.
> **Do NOT use when:** you only need to re-check one field mid-session (use `get_project` or `list_tasks`).
> **Side effects:** none (a pack-generated event is logged for freshness metrics).
> **Returns:** `{ manifest: {generated_at, sources, token_estimate}, sections: [...] }`.
> **Errors:** `NOT_FOUND` (bad id — re-run `list_projects`), `FORBIDDEN_FOR_ROLE` (token not scoped to this project — stop, report to human).

And the two most smell-prone rules, made explicit: (1) staged tools (`propose_brain_update`, `request_approval`) must say *in the description* that nothing is applied until human approval — otherwise agents will assume the write happened; (2) `update_task` must enumerate the statuses the caller's role may set (Workers cannot set `done`), or agents will discover the boundary by failing.

## 18.4 Features to remove from MVP

- **Hosted worker/coding agents.** Claude Code is the worker; ship-faster gives it a role contract over MCP. An agent runtime inside a PM tool is a second startup.
- **Autonomous client communication.** No agent sends WhatsApp/email to clients, ever, in MVP. The Project Lead drafts; you send. One wrong autonomous message costs more than the tool saves — and per interview Q9, it's the most likely uninstall trigger.
- **Agent-to-agent chat / mention routing.** Tasks + comments are the message bus.
- **Time tracking / invoicing.** Money-aware milestones cover "what's owed." Invoicing is a different product with legal/formatting rabbit holes.
- **pgvector / semantic memory.** A per-project brain is a few thousand tokens of structured text; Postgres full-text search covers retrieval. Revisit only when brains exceed pack budgets in practice (QA metric in §18.14 will tell you).

## 18.5 Features to delay until later

- **Agent Skills** — delay until ≥2 hosted roles exist and repetition is observed. Abstraction ahead of evidence.
- **Intake Agent** — real pain (your comms are WhatsApp/email/calls), brittle plumbing. MVP-lite: **"Paste → Tasks"** review screen (spec in Section 19, Role 3). Promote to an auto-ingesting agent post-MVP.
- **Multi-user/team, client portal, LLM-compressed packs, cross-project brain search** — post-validation, post-MVP.

## 18.6 Missing features that should be added

1. **Session Log (work journal).** Every agent session ends with `log_session`: `{ task_id, summary, changes: [files/PRs], tests_status, blocked_on?, next_step, brain_proposals? }`. This is the missing feedback loop — packs feed agents, session logs feed the brain and your client updates. **The second sellable feature after the Context Pack.**
2. **Approvals inbox.** One surface for all staged agent actions: brain diffs, drafted client messages, plan changes. Without a single inbox, "human approval" degenerates into ignored notifications.
3. **Money view ("What's owed").** Cross-client: unpaid milestones, retainer status, aging.
4. **Staleness detection.** Dumb cron: tasks untouched N days, projects with no activity, brains stale ≥5 sessions. Feeds the Project Lead's triage.
5. **Per-agent audit trail.** Every MCP write stamped with agent identity, visible in the feed. Trivial now, painful to retrofit.
6. **Eval harness** *(QA/Evaluation lens — new)*: the product makes measurable claims ("agents work better briefed"), so it must measure them. Spec in §18.14.

## 18.7 Features that are risky or unclear

- **User-visible free-form "memory"** — risky; brains rot into junk drawers. Mitigation: fixed sections + diff-only agent writes (§18.11).
- **Agent autonomy boundaries** — resolved via the permission matrix in Section 19; rule of thumb: *agents freely mutate task state; anything touching clients, money, or the Brain goes through approval.*
- **Linear's agent ecosystem** — the real strategic risk. If Linear ships context curation for assigned agents, the wedge narrows to freelancer money-awareness + comms intake. Mitigation: move fast on the Brain/Pack/Log loop (they're structurally unlikely to build client-money features), and validate with the ICP Linear underserves.
- **"APM" ambiguity** — the competitor list included APM; I've treated it as the AI-project-manager tool category. If a specific product was meant, add it to the §18.0 matrix.
- **SQLite → Supabase migration** — contained risk: one data-access layer now (§18.12), mechanical swap later.

## 18.8 Recommended final MVP feature set

**Core data:** Clients, Projects, Tasks, Milestones with amounts + payment status, Comments, Activity log.
**Brain loop:** structured brain sections; `get_context_pack`; `log_session`; Brain Sync diffs; Approvals inbox.
**Agents:** one hosted **Project Lead Agent**; **Worker role contract** for external agents; **Paste → Tasks** parser.
**Human surfaces:** Today, per-project Board/Brain/Activity/Milestones, Money, Approvals, Agents.
**Agent surface:** the 12 MCP tools, token-authenticated per agent, description-linted, fully audited.
**Out:** hosted coding agents, autonomous client messaging, agent skills, invoicing, multi-user, pgvector.

## 18.9 Recommended final agent role model

| Role | Kind | One-line charter |
|---|---|---|
| **Project Lead Agent** | Hosted, scheduled + on-demand | Keeps plans honest: triages, flags staleness, drafts status updates, curates the brain. Never contacts clients, never writes code. |
| **Worker Agent** | External (Claude Code etc.), role contract | One task at a time: pull pack → work in repo → `log_session` → propose brain diffs. |
| **Intake Parser** | One-shot tool (agent later) | Pasted comms → draft tasks; 100% human-confirmed. |
| **Brain Sync** | System workflow, invisible | Session log / task close → brain diff proposal → approval → versioned merge. |

Full contracts and the permission matrix are in Section 19.

## 18.10 Context Pack specification
*(Context Pack Architect)*

Deterministic assembly — no LLM call in MVP (fast, free, debuggable, trustable shape). `get_context_pack(project_id, task_id?, token_budget=4000)`:

Priority order (trim from the bottom when over budget; never truncate mid-section — drop whole sections):
1. **Pack manifest** — generated_at, pack version, sources included/dropped, token estimate. *(Agents must be able to see what they were NOT told.)*
2. **Focused task** — title, description, acceptance criteria, full comment thread.
3. **Brain: Current state** + **Conventions** (always), **Environment/URLs** (if task touches deploy/infra keywords).
4. **Brain: Decisions** — most recent first, capped.
5. **Related open tasks** — same project, one line each (id, title, status, assignee).
6. **Recent activity** — last 10 entries, one line each.
7. **Brain: Client notes, Open questions** — included only if budget remains.

Post-MVP: `mode: "compressed"` (LLM-summarized) once the eval harness (§18.14) can prove compressed packs don't raise rework rate.

## 18.11 Project Brain schema
*(Project Memory Designer)*

Fixed sections per project — additions require a schema change, on purpose:
`current_state` (rewritten often), `decisions` (append-mostly, dated, each with evidence link), `conventions` (code style, branch/deploy process), `environment` (URLs, hosting, staging, where secrets live — *pointers*, never secret values), `client_notes` (preferences, quirks, comms channel), `open_questions` (unresolved items, feeds Project Lead triage).

Rules: humans edit directly (versioned); agents only via `propose_brain_update` diffs `{section, operation, before, after, evidence: session_log_id}`; every merge versioned with evidence links; full-text search, no embeddings in MVP.

## 18.12 Technical architecture
*(Next.js SaaS Architect + Supabase Architect)*

**MVP (personal, local):** keep SQLite + local MCP server, but all DB access behind one data layer (repository module) so the swap below is mechanical. Do not build auth you don't need yet.

**Sellable version (post-validation):** Next.js App Router on Vercel + Supabase.
- **Routes:** `/(dashboard)/today | approvals | projects/[id]/(board|brain|activity|milestones) | clients | money | agents`; mutations as server actions; MCP server as a separate Node service (or Supabase Edge Function) speaking to the same Postgres.
- **Tables:** `clients, projects, tasks, milestones, comments, activity, session_logs, brain_sections, brain_diffs, agents, approvals` — matching the MVP data model 1:1.
- **Auth & RLS:** humans via Supabase Auth; agents via per-agent API keys mapped to an `agents` row carrying `{role, project_scope}`. RLS policies enforce the Section 19 permission matrix *in the database*, not just in the MCP layer — Worker tokens literally cannot read other projects' rows. Defense in depth: MCP layer returns typed `FORBIDDEN_FOR_ROLE`; RLS is the backstop.
- **pgvector:** installed-not-used until §18.14 metrics justify it.

## 18.13 Security & permissions model
*(Security & Permissions skill)*

- **Identity:** every MCP caller is an `agents` row: `{name, role, token_hash, project_scope, created_at, revoked_at}`. No shared tokens. One-click revoke in the Agents screen.
- **Least privilege by role:** enforced twice (MCP layer + RLS). Permission matrix in Section 19.
- **Staged-write pattern:** anything touching clients, money, the Brain, or outbound comms is *proposal-only* (`request_approval`, `propose_brain_update`). Approval resolution is dashboard-only — there is deliberately no MCP tool to approve things, so a compromised or confused agent cannot approve its own proposals.
- **Prompt-injection surface:** client-originated text (Paste → Tasks input, task descriptions from intake) is data, not instructions — the Intake Parser output is quotes + drafts, and Worker packs label intake-derived content as untrusted client text.
- **Rate limits:** per-token write caps (e.g., 30 writes/hour for Workers, task-creation cap of 5 subtasks/session) to bound blast radius of a looping agent.
- **Audit:** every write carries agent id + reason; activity log is append-only.

## 18.14 QA / Evaluation plan
*(QA/Evaluation skill)*

The product's claims must be falsifiable in-product:
- **Context Pack efficacy (the headline eval):** golden set of ~10 real historical tasks; run Worker sessions with pack vs. without (or with raw Linear-style issue text); compare rework rate, blocked rate, and "asked a question already answered in the Brain" rate. This is also the sales demo.
- **Brain quality:** diff acceptance rate (target >70% — lower means Brain Sync proposes junk); brain freshness (≤2 sessions since last merged update).
- **Project Lead quality:** human override rate on triage actions (target <20%); edit distance on drafted client updates.
- **Intake quality:** edit distance between drafted and confirmed tasks; missed-commitment count (commitments that later surface outside the tool — target 0).
- **Tool ergonomics** *(ties to §18.3b)*: track wrong-tool-call and typed-error rates per tool per role; a tool with a high `FORBIDDEN_FOR_ROLE` rate has a smelly description — fix the description before touching code.
- Weekly eval script over these metrics, shown on an internal `/evals` page. If pack-vs-no-pack shows no difference after 20 golden runs, the core thesis is wrong — stop and rethink before GTM spend.

## 18.15 GTM strategy & pricing
*(GTM Strategy + Pricing & Packaging skills)*

**Positioning:** not "another AI PM tool" (Dart owns that shelf) — **"the context layer for your coding agents."** Headline: *"Your coding agents, briefed."* Sub: *"Ship client work with agents that already know the project — and file their work reports back."*

**Sequence:** (1) use it yourself across your 6 client projects for 4+ weeks — the eval metrics become the landing-page proof; (2) landing page + waitlist into Claude Code/Cursor/agency communities, target 100 signups; (3) 10 design-partner betas from interviews, free for feedback, 6 weeks; (4) public launch (X/HN/Product Hunt) with the pack-vs-no-pack eval numbers as the hook. Kill criteria at each gate per §18.0.

**Packaging** (validate price points in interviews, Q8):
- **Solo — free:** local/self-hosted, 3 projects, 2 agent tokens. The wedge into the community; also your own tier.
- **Pro — ~$19/mo:** hosted, unlimited projects/agents, Money view, Approvals, evals. The freelancer tier; this is the business.
- **Agency — ~$49/mo/workspace:** seats, roles per human, client portal (later), priority support.
- Price on projects/seats, **never on agent actions or tokens** — metering agent calls punishes the exact behavior the product exists to encourage.

---

# Section 19: Agent Role Clarity
*(Regenerated with Agent Role Designer + Security & Permissions + MCP Tool Description Writer lenses.)*

## Permission matrix (enforced at MCP layer AND RLS)

| Tool | Project Lead | Worker | Intake Parser | Brain Sync* |
|---|---|---|---|---|
| `list_projects` | ✅ all | ✅ scoped project only | — | internal |
| `get_project` | ✅ | ✅ own project | — | internal |
| `get_context_pack` | ✅ | ✅ | — | — |
| `list_tasks` | ✅ | ✅ own project, read-only | ✅ titles only (dedup) | internal |
| `create_task` | ✅ (≤5/run without approval) | subtasks of own task only (≤5/session) | ❌ (drafts only; human confirms) | ❌ |
| `update_task` | ✅ incl. priority/assignee; ❌ hard-delete | own task; statuses `in_progress/blocked/review` only; ❌ `done` | ❌ | ❌ |
| `add_comment` | ✅ | own task only | ❌ | ❌ |
| `log_session` | ✅ (its runs) | ✅ required per session | — | — |
| `get_brain` | ✅ | ✅ | ❌ | internal |
| `propose_brain_update` | ✅ | ✅ | ❌ | ✅ (its whole job) |
| `request_approval` | ✅ | ✅ | — (flow is inherently approval) | — |
| `search` | ✅ | ✅ own project | ❌ | internal |
| Approve/resolve approvals | ❌ **human-only, dashboard-only** | ❌ | ❌ | ❌ |
| Clients / milestones / money mutation | ❌ | ❌ | ❌ | ❌ |
| Outbound messages to clients | ❌ (drafts via approval only) | ❌ | ❌ | ❌ |

*Brain Sync is server-side code, not an MCP client; "internal" = direct data-layer access within its workflow, still audited.

## Role 1: Project Lead Agent

- **Role name:** Project Lead Agent (one per workspace; per-project context per run)
- **Purpose:** Keep every project's plan truthful and the human unblocked — triage, prioritize, surface risk, draft communications.
- **User-facing description:** "Your project lead reviews all projects daily, flags what's stale or blocked, keeps priorities in order, and drafts your client updates for approval."
- **Internal system responsibility:** Scheduled run (daily + on-demand): read staleness report, open tasks, session logs since last run, milestone status; reconcile plan vs reality; emit a Triage Report.
- **Allowed actions:** Read whole workspace. Create/update/reprioritize tasks; change status; comment; assign tasks to Worker role or the human; stage client-update drafts via `request_approval`; `propose_brain_update`; flag at-risk milestones (comment + Today flag).
- **Forbidden actions:** Any outbound communication; client/project/milestone CRUD; changing amounts or payment status; direct Brain writes; hard-deleting tasks (may cancel with reason); resolving approvals; executing code or touching repos; any tool outside the matrix.
- **Required inputs:** Per project — open tasks with ages, last 10 activity entries, session logs since last run, milestone status + due dates, brain `current_state` + `open_questions`, staleness report.
- **Required outputs:** Structured **Triage Report** per run: `{ project, actions_taken: [mutations + reasons], flags: [risks], drafts: [→ approvals], brain_proposals: [diff ids] }`, rendered in Activity and summarized on Today.
- **MCP/API tools allowed:** rows marked ✅ in its matrix column.
- **Human approval rules:** Always for: client-facing drafts, brain diffs, cancelling a task, touching any task the human edited in the last 24h, creating >5 tasks/run. Never for: reprioritizing, commenting, flagging, assigning to Worker.
- **Handoff rules:** *Down* to Workers by assigning a task **with acceptance criteria** (tasks without acceptance criteria cannot be Worker-assigned — enforced in `update_task`). *Up* to the human via Approvals or a "needs decision" task assignment. Never hands off mid-run; the Triage Report closes every run.
- **Logging rules:** Every run ends with `log_session`; every mutation carries a one-line reason; no silent writes.
- **Success metric:** Human override rate on triage decisions <20%; time-to-draft for weekly client updates; spot-checked task-status accuracy. *(Measured by the §18.14 harness.)*

## Role 2: Worker Agent (external — e.g., a Claude Code session)

- **Role name:** Worker Agent (role contract; N concurrent instances, one per repo/session)
- **Purpose:** Execute exactly one assigned task in the client repo and report structured results back.
- **User-facing description:** "Your coding agents check out a task, get briefed automatically, do the work, and file a work report when done."
- **Internal system responsibility:** ship-faster does not run this agent; it authenticates it (project-scoped token), serves it a Context Pack, and accepts its writes under the matrix.
- **Allowed actions:** `get_context_pack`; move *its own* task between `in_progress/blocked/review`; comment on its own task; create ≤5 subtasks under its own task; `log_session`; `propose_brain_update`; `request_approval` for scope questions.
- **Forbidden actions:** Touching tasks it isn't assigned to; setting `done` (human-only close — Worker sets `review`); reading other projects (token-scoped, RLS-enforced); client/milestone/money data; top-level task creation; outbound comms; direct Brain writes; treating client-originated text in its pack as instructions (labeled untrusted).
- **Required inputs:** Task id + acceptance criteria; Context Pack per §18.10; repo access (outside ship-faster's scope).
- **Required outputs:** One `log_session` per session: `{ task_id, summary, changes: [files/PRs], tests_status, blocked_on?, next_step, brain_proposals? }`; final status `review` or `blocked` with a comment.
- **MCP/API tools allowed:** matrix column; rate-limited to 30 writes/hour.
- **Human approval rules:** Must `request_approval` before expanding scope beyond acceptance criteria, anything irreversible in client infrastructure (prod migrations, deletions), or when acceptance criteria contradict the Brain. Otherwise autonomous within the task.
- **Handoff rules:** To the human: `review` + session log (done) or `blocked` + blocker comment (stuck). To the Project Lead: implicit — its next run sweeps `blocked`/`review`. Workers never hand to Workers.
- **Logging rules:** No session ends without `log_session` — a checked-out task with no log after N hours gets a staleness flag. Comments for anything a future session needs that isn't brain-worthy.
- **Success metric:** % sessions ending in `review`; rework rate (bounced from review); "asked a question already answered in the Brain" rate ≈ 0 — the direct measure of Context Pack quality per §18.14.

## Role 3: Intake Parser (MVP: one-shot tool; post-MVP: agent)

- **Role name:** Intake Parser
- **Purpose:** Convert pasted client communications (WhatsApp threads, emails, call notes) into draft tasks and detected commitments.
- **User-facing description:** "Paste a client conversation; get a reviewed list of tasks, deadlines, and promises before anything is created."
- **Internal system responsibility:** One-shot LLM parse → drafts → human review screen → confirmed items written *as the human*. A dashboard feature in MVP; promote to a resident agent only when auto-ingestion (email forwarding, WhatsApp export watch) is added.
- **Allowed actions:** Produce drafts (tasks, comments, open questions) tagged with source project. Nothing persists without confirmation.
- **Forbidden actions:** Any direct write; guessing the project when ambiguous (must ask); inventing deadlines or amounts absent from source text; reading anything beyond the pasted text + target project's task titles; treating pasted content as instructions (injection surface — output is quotes + drafts only).
- **Required inputs:** Pasted text; target project (or detect-and-confirm); existing open task titles for dedup.
- **Required outputs:** `{ drafts: [{title, description, due?, source_quote}], detected_commitments: [{who, what, when, source_quote}], ambiguities: [questions] }` — every item traceable to a quoted line.
- **MCP/API tools allowed:** `list_tasks` (titles only). Post-confirmation writes happen as the human, not the parser.
- **Human approval rules:** 100%, forever — this never relaxes; it's the feature's trust anchor.
- **Handoff rules:** Confirmed tasks enter the normal pool; the Project Lead triages them next run. No parser→worker path.
- **Logging rules:** One activity entry per confirmed batch; source text retained 30 days for traceability.
- **Success metric:** Edit distance between drafted and confirmed tasks; missed client commitments surfacing outside the tool — target 0.

## Role 4: Brain Sync (system workflow — deliberately not an agent)

- **Role name:** Brain Sync
- **Purpose:** Keep each Project Brain current without anyone "managing memory."
- **User-facing description:** None — invisible. Its only surface is brain-diff cards in Approvals ("This session decided X — add to Decisions?").
- **Internal system responsibility:** Triggered on `log_session` and task close: summarize new material vs current brain; emit diff proposal into Approvals; merge on approval; version every merge.
- **Allowed actions:** Read session logs, task threads, current brain (triggering project only); create diff proposals.
- **Forbidden actions:** Auto-merging anything in MVP (even "trivial" diffs); creating new brain sections; touching tasks/clients/money; running on any trigger other than the two defined.
- **Required inputs:** Triggering session log or closed-task thread + that project's current brain.
- **Required outputs:** `{ section, operation: add|update|remove, before, after, evidence: session_log_id }`.
- **MCP/API tools allowed:** None — server-side code, direct data layer, still audited.
- **Human approval rules:** Every diff, always (MVP). Post-MVP: auto-merge only additions to `current_state`, never Decisions/Conventions.
- **Handoff rules:** Terminal. Rejected diffs logged with reason to tune the summarizer prompt.
- **Logging rules:** Every proposal/approval/rejection/merge is an activity entry; Brain tab shows version history with evidence links.
- **Success metric:** Brain freshness ≤2 sessions since last merged update; diff acceptance rate >70%.

---

**Bottom line (regenerated):** The skills pack sharpened three things. *Competitor intelligence* shows "agents + MCP" is already table stakes (Linear, Dart) — the wedge is the **Brain → Context Pack → Session Log loop plus role-scoped, approval-gated permissions plus freelancer money-awareness**, and it must be validated with the §18.0 waitlist/interview gates before any multi-user build. *MCP tool description quality* is a first-class product surface with a lintable template, per the arXiv smell findings. And the *QA/Evaluation harness* makes the core claim falsifiable: if briefed agents don't measurably beat unbriefed ones on the golden-task set, stop before spending on GTM.
