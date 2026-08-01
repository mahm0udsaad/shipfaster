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

### Security — tenant isolation (M7, applied)
Two independent layers, deliberately redundant:

1. **Repository account filter.** Every tenant-table read/write goes through
   `scopedSelect`/`scopedUpdate` in `src/lib/db/repository.ts`, which cannot be called
   without an `ActorContext`. Forgetting the account filter is a type error, not a silent
   cross-tenant read. Enforced by `tests/db/tenancy.test.ts`.
2. **Row Level Security** (migration `0005_rls.sql`) on all 12 tenant tables plus
   `accounts`/`account_members`. Agents are not Supabase Auth users, so `authenticate()`
   mints a short-lived per-agent JWT carrying an `account_id` claim
   (`src/lib/db/actor-token.ts`); policies resolve the caller's accounts from that claim,
   or from `account_members` for dashboard humans.

Verify RLS actually binds (not just that it is switched on):
```bash
node --env-file=.env.local --import tsx/esm scripts/verify-rls.ts
```

**Key configuration matters more than it looks.** `SUPABASE_SECRET_KEY` must hold the
`sb_secret_…` key (Settings → API Keys → Secret keys). It is the only key that bypasses RLS.
This variable previously held the **anon** key: with RLS off that went unnoticed for months
because anon had full access to everything; with RLS on it presents as every read returning
zero rows. `client.ts` now refuses to start on a non-privileged key.

`SUPABASE_JWT_SECRET` (Settings → JWT Keys → Legacy JWT Secret) signs the per-agent tokens.
Supabase now uses that secret only to *verify* JWTs, which is what the minting relies on —
if you ever disable the legacy secret, minting stops, queries fall back to the secret key
(RLS bypassed) and it warns loudly. Only `src/lib/db/actor-token.ts` would need to change.

### Deploying (Vercel)
The build itself needs no secrets — a clean checkout with no env file compiles. Every
variable below is read at REQUEST time, so a missing one deploys fine and then 500s on the
first page load. Set all of them (Project → Settings → Environment Variables), then redeploy:

| Variable | Used by | Missing ⇒ |
| --- | --- | --- |
| `SUPABASE_URL` | server clients | every server read throws |
| `SUPABASE_SECRET_KEY` | `serviceClient()` — the only key that bypasses RLS | login resolves no membership; dashboard 500s |
| `SUPABASE_JWT_SECRET` | per-agent tokens | agents fall back to the secret key (RLS bypassed, warns) |
| `NEXT_PUBLIC_SUPABASE_URL` | browser + middleware | middleware waves every request through |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | session cookies, middleware | sign-in cannot start |
| `OWNER_TOKEN` | MCP owner auth | MCP tools reject the owner |
| `OWNER_ACCOUNT_ID` | optional | only needed once a second account exists |

Human logins are Supabase Auth users, not env config — create them with
`scripts/provision-user.ts` (see below), which is also the only supported way to attach one
to an account.

### Content calendar (`/content`)
A month grid for scheduling content: title, optional creative, copy, and a slot, optionally
tied to a project. Click a day to compose, click a post to edit, drag it to another day to
reschedule (the clock time follows). The month lives in the URL (`?m=YYYY-MM`).

Creatives go to the **private** `content-media` bucket and are rendered through short-lived
signed URLs — uploads and reads both go through the server, so no storage policy grants the
browser anything. A pasted `https://` link is stored as-is instead.

Day bucketing happens in the browser's timezone, not the server's (`src/lib/calendar.ts`);
the server only fetches a padded window around the month. Verify the storage path against
the live project:
```bash
node --env-file=.env.local --import tsx/esm scripts/verify-content.ts
```

### Dashboard logins + roles (`0007`, `0008`)
Sign-in is Supabase Auth over cookies. `getDashboardContext()` derives the account from the
signed-in user's `account_members` row and carries **that user's** access token, so queries
run under RLS as them. `getOwnerContext()` is now scripts-only.

`media_buyer` is a restricted role: it reaches `/content` and nothing else. Three layers,
deliberately redundant — RLS (`ship_faster_full_account_ids()`, the real control, since their
browser holds a session token and PostgREST is public), `requireFullAccess()` per page, and a
filtered sidebar (presentation only).

```bash
# create a login — password comes from the environment, never an argument
NEW_USER_PASSWORD='…' node --env-file=.env.local --import tsx/esm \
  scripts/provision-user.ts someone@agency.com media_buyer

# prove the restriction binds at the database, not just in the UI
MEDIA_BUYER_EMAIL=… MEDIA_BUYER_PASSWORD=… node --env-file=.env.local --import tsx/esm \
  scripts/verify-media-buyer.ts
```

Still open: invites and self-serve signup — provisioning is owner-run, and a user with an
auth row but no membership is refused at sign-in rather than shown an empty dashboard.

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
