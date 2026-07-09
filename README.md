# ship-faster

The context layer for your coding agents. An agent-native PM tool for solo freelancers
and small dev agencies: brief your AI agents automatically (Context Packs), capture their
work reports (Session Logs), compound it into per-project memory (Project Brain), and keep
every agent action under an approval-gated permission model — with freelancer money-awareness
(milestones, what's owed across clients).

See [docs/development-plan.md](docs/development-plan.md) for the full build plan and
[docs/section-18-19-critique-and-agent-roles.md](docs/section-18-19-critique-and-agent-roles.md)
for the product/agent architecture.

## Stack
- Next.js (App Router) dashboard + a Node MCP server, sharing one Supabase Postgres database.
- All DB access goes through `src/lib/db/repository.ts` — nothing else touches Supabase directly.

## Status — M0 (Foundation) complete
- ✅ 11-table schema (`supabase/migrations/0001_core_schema.sql`)
- ✅ Data-access layer (`src/lib/db/repository.ts`)
- ✅ MCP server + auth + typed errors (`src/mcp/`)
- ✅ 4 read tools: `list_projects`, `get_project`, `list_tasks`, `search`
- ✅ Description-lint contract + tests (`npm run lint:tools`, `npm test`)
- ⏳ Awaiting a Supabase project to apply the migration against.

Next: M1 (core loop — Context Pack, Session Log, Brain, write tools). See the plan.

## Develop
```bash
npm install
cp .env.local.example .env.local   # fill in Supabase URL + keys + OWNER_TOKEN
npm run test          # unit tests (infra-agnostic)
npm run lint:tools    # MCP description lint (CI guard)
npm run typecheck
npm run mcp           # start the MCP server (needs env + a live DB)
npm run dev           # start the dashboard
```

## The 12 MCP tools (target)
Read: `list_projects`, `get_project`, `get_context_pack`, `list_tasks`, `get_brain`, `search`.
Write: `create_task`, `update_task`, `add_comment`, `log_session`.
Staged (proposal-only): `propose_brain_update`, `request_approval`.

Every tool description follows the six-part §18.3b contract, enforced in CI.
