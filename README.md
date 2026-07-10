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

## Status — M0 + M1 complete, live on Supabase
- ✅ 11-table schema applied to the live Supabase project **`ship-faster`** (ref `pirvbnagoqcdnqhkohto`, eu-central-1)
- ✅ 6 client projects seeded (bookitfly, kafel, whatsapp-cs, mr-dashboard, multigates, ingaz), each with 6 brain sections
- ✅ Data-access layer (`src/lib/db/repository.ts`) — reads + audited writes
- ✅ MCP server + token auth + typed errors (`src/mcp/`)
- ✅ **All 12 MCP tools** (6 read, 4 write, 2 staged) — role-scoped per Section 19
- ✅ Deterministic Context Pack assembler (`src/lib/context/pack.ts`)
- ✅ Description-lint contract + 34 tests + generated DB types
- ✅ **Live end-to-end verified** (`scripts/verify-live.ts`): auth → tool → repository → Postgres

### Before running against the live DB
Fill `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` (from the Supabase dashboard → Project Settings → API).
It is intentionally NOT stored here and cannot be fetched via MCP.

### ⚠️ Security note — RLS is disabled (expected for MVP)
All 11 tables have Row Level Security **off**. The architecture keeps the service-role key
server-side only (repository layer) and never ships the anon key with table access to the
browser, so this is acceptable for the local/personal MVP. **Do not** expose the anon key to
untrusted clients until M7 adds RLS policies enforcing the Section 19 permission matrix.

Next: M2 (dashboard — Today / Board / Brain / Approvals / Money / Agents). See the plan.

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
