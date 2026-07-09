# ship-faster — Development Plan
*Solo founder + AI build agents (Claude Code / Codex). Sequenced against the 90-day GTM plan, because the launch headline is the eval numbers, and those only exist after the core loop is dogfooded on real client work.*

## The one sequencing rule

**Build the smallest thing you can run against your own 6 client projects, then dogfood relentlessly.** Everything hostable, multi-user, or autonomous waits until dogfooding proves the core loop earns its keep. The critical path to launch is: *core loop → dogfood → eval numbers → launch*. Nothing that isn't on that path gets built before day 60.

## Guardrails (decided in Section 18 — do not relitigate mid-build)
- **One data-access layer.** Every DB call goes through a repository module. SQLite now, Supabase later must be a mechanical swap, not a rewrite.
- **Description-lint the MCP tools** (§18.3b template) from the first tool, in CI. A smelly description is a bug.
- **Staged writes are proposals.** `propose_brain_update` / `request_approval` never mutate directly. There is deliberately no MCP tool to *approve* — approval is dashboard-only.
- **Out of scope until post-validation:** hosted worker agents, autonomous client messaging, pgvector, invoicing, multi-user, agent skills. If you're tempted, write it in a `LATER.md`, not in code.

## Stack
- **MVP (local, personal):** single repo. Next.js (App Router) dashboard + a Node MCP server process, both pointing at **one SQLite file** through the shared data layer. No auth beyond a single owner token + per-agent tokens.
- **Sellable (post-validation):** Supabase Postgres + RLS enforcing the Section 19 permission matrix, Vercel hosting, Stripe billing. Same table shapes — the migration is schema + policies, not logic.

---

## Milestones

### M0 — Foundation *(target: week 1)*
**Goal:** schema + data layer + MCP skeleton that authenticates and serves reads.
- SQLite schema: `clients, projects, tasks, milestones, comments, activity, session_logs, brain_sections, brain_diffs, agents, approvals` (matching §18.12 so the Supabase swap is 1:1).
- Repository module — the only thing that touches the DB.
- MCP server boots, authenticates a per-agent token → resolves an `agents` row `{role, project_scope}`.
- Ship read tools **1–2, 4, 12**: `list_projects`, `get_project`, `list_tasks`, `search`.
- Seed your 6 real client projects (bookitfly, kafel, whatsapp-cs, mr-dashboard, multigates, ingaz) as the dogfood dataset.
- **Done when:** from a Claude Code session you can `list_projects` and `get_project` against real data, scoped by token.

### M1 — The core loop *(target: weeks 2–3) — THIS IS THE PRODUCT*
**Goal:** an agent can be briefed, do work, report back, and propose memory updates.
- Brain sections: fixed schema (`current_state, decisions, conventions, environment, client_notes, open_questions`), human-editable, versioned.
- Tool **3** `get_context_pack` — deterministic assembly with the §18.10 priority order, whole-section trimming, and a manifest that tells the agent what it was *not* given.
- Tool **8** `log_session` — structured work report schema.
- Tools **5, 6, 7** `create_task`, `update_task` (role-limited statuses — Worker can't set `done`), `add_comment`.
- Tools **9, 10** `get_brain`, `propose_brain_update` (diff proposals only).
- **Brain Sync** workflow: on `log_session` / task close → summarize vs current brain → diff proposal into `approvals`.
- Tool **11** `request_approval`.
- **Done when:** you assign yourself a real task, a Claude Code Worker pulls a context pack, does the work in the client repo, files a `log_session`, and a brain diff lands in the approvals queue. **All 12 MCP tools now exist.**

### M2 — Human dashboard *(target: weeks 3–4, overlaps M1)*
**Goal:** the surfaces you need to actually run your week and approve agent work.
- **Today** — cross-project due/overdue/blocked/stale + top of approvals.
- **Project → Board / Brain / Activity / Milestones.**
- **Approvals inbox** — resolve brain diffs and drafts (this is the only place approvals happen).
- **Money** — what's owed across clients (milestones: pending/invoiced/paid).
- **Agents** — list, roles, tokens, last activity; one-click token revoke.
- Every agent write shows agent identity on the card / in the feed (audit).
- **Done when:** you can run a full day out of the dashboard — triage on Today, approve in the inbox, check Money — without opening the DB. **Dogfooding starts here.**

### M3 — Project Lead Agent *(target: weeks 5–6)*
**Goal:** the one hosted agent that keeps plans honest.
- Staleness detection (dumb cron: tasks untouched N days, projects with no activity, brains stale ≥5 sessions).
- Scheduled + on-demand triage run → **Triage Report** (§19 Role 1): task mutations w/ reasons, risk flags, client-update drafts → approvals, brain proposals.
- Enforce its permission column (no client/money/outbound, no hard-delete, approval gates).
- **Done when:** a daily run reorders your priorities, flags what's stale, and drops a drafted client update in approvals that you'd actually send.

### M4 — Intake Parser (Paste → Tasks) *(target: week 6)*
**Goal:** turn WhatsApp/email threads into reviewed tasks.
- Dashboard "Paste → Tasks" box: paste text → one-shot LLM parse → `{drafts, detected_commitments, ambiguities}`, every item traceable to a quoted line.
- Human review screen; confirmed items written **as you**, not the parser. 100% human-confirmed.
- Treat pasted text as untrusted data, never instructions (injection guard).
- **Done when:** you paste a real client WhatsApp thread and confirm 4–6 accurate tasks in under a minute.

### M5 — Eval harness *(target: weeks 7–8) — GATES THE LAUNCH*
**Goal:** make the core claim falsifiable and produce the launch headline.
- Golden set: ~10 real historical tasks from your dogfooding.
- Run Worker sessions **with context pack vs. without** (raw issue text). Measure rework rate, blocked rate, "asked a question already answered in the Brain" rate.
- Secondary metrics: brain diff acceptance rate (>70%), Project Lead override rate (<20%), intake edit distance, per-tool `FORBIDDEN_FOR_ROLE` rate.
- Internal `/evals` page rendering the weekly numbers.
- **Done when:** you have a defensible number like *"context packs cut rework ~X% across N real tasks."* **If pack ≈ no-pack, stop and rethink before spending on GTM** (this is the thesis check).

### M6 — Ship the MCP server publicly *(target: week 8, parallel with M5)*
- Publish `server.json` to the official MCP Registry (auto-propagates to Smithery/Glama/PulseMCP).
- Claim the Glama listing; ship a Claude Code plugin/skill.
- Public README + a 60-second Veo/Flow demo (real Claude Code session pulling a pack).
- **Done when:** a stranger can install the ship-faster MCP server from a registry and connect an agent.

### M7 — Sellable hardening *(target: weeks 9–12, ONLY if M5 validated + design partners want in)*
- Supabase migration behind the data layer (schema + RLS policies enforcing the §19 matrix — Worker tokens literally cannot read other projects' rows).
- Supabase Auth for humans; per-agent API keys as `agents` rows.
- Vercel deploy; Stripe billing for the tiers (Solo free / Pro $19 / Agency $49).
- Per-token rate limits (Workers 30 writes/hr, 5 subtasks/session).
- **Done when:** a design partner signs up, connects their agent, and pays — on infrastructure that isn't your laptop.

---

## Timeline ↔ GTM alignment

| Weeks | Build | GTM (from the research plan) |
|---|---|---|
| 1–2 | M0 + start M1 | Landing page + waitlist; join r/ClaudeCode, Claude Discord, help daily |
| 3–4 | Finish M1 + M2 → **dogfooding begins** | Keep engaging communities; start build-in-public on X |
| 5–6 | M3 + M4, keep dogfooding | Veo demo clips; recruit 10 design partners via ~20 DMs/day |
| 7–8 | M5 (evals) + M6 (publish MCP) | Design-partner betas running; evals become launch copy |
| 9–12 | M7 (only if validated) | **Show HN** (eval numbers as headline) → PH 2–4 days later → convert with founding-member offer |

**Kill/adjust gates:** M5 shows no pack advantage → rethink before launch spend. <4/10 design partners using it weekly → the pain is imagined. Card-trial conversion >30% → raise the price.

## Delegation to your AI build agents
- **Claude Code** (in this repo): schema, data layer, MCP tools + the description-lint CI rule, dashboard. Give each tool its §18.3b description as the spec.
- **Codex** (second opinion / parallel): the deterministic `get_context_pack` assembler and the eval harness — self-contained, testable, good candidates for an independent pass.
- Keep tools covered by tests from M0 — agents will call them thousands of times; a typed-error contract (`NOT_FOUND`, `FORBIDDEN_FOR_ROLE`, `APPROVAL_REQUIRED`) is what lets Workers recover instead of retry-looping.

## First week, concretely
1. Init repo, Next.js + SQLite + repository module + `agents`/token auth.
2. Schema migration for all 11 tables.
3. `list_projects`, `get_project`, `list_tasks`, `search` — with description-lint in CI.
4. Seed your 6 client projects.
5. Prove it: `list_projects` from a Claude Code session, scoped by token. That's M0 done — and the spine everything else hangs off.
