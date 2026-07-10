# Dogfooding ship-faster on itself

ship-faster is registered as a project inside its own database. The build (M0–M7) lives
in it as real tasks, its Brain holds the actual decisions, and a scoped agent token lets
Claude Code work on it through the MCP server.

## Your identity
- **Owner:** Mahmoud (set via `OWNER_NAME` in `.env.local`; shown in the dashboard sidebar).
- **Agent:** `worker/ship-faster` — role `worker`, scoped to the ship-faster project only.

## Connect Claude Code to the ship-faster MCP server

Create `.mcp.json` in the project root (or run `claude mcp add`). Use the worker token that
was generated for you (kept out of version control — paste it here):

```json
{
  "mcpServers": {
    "ship-faster": {
      "command": "npm",
      "args": ["run", "mcp"],
      "env": { "SHIP_FASTER_TOKEN": "<your sfk_… worker token>" }
    }
  }
}
```

The `mcp` script loads `.env.local` (`node --env-file=.env.local …`), so Supabase creds come
from there; only the per-agent `SHIP_FASTER_TOKEN` goes in the MCP config. Restart Claude Code
so it picks up the server.

## Using it — the loop

From a Claude Code session in this repo, your worker agent can:
1. `list_projects` → sees only `ship-faster` (it is project-scoped).
2. `get_context_pack(project, task)` → gets briefed with the Brain + task + history.
3. do the work in the repo.
4. `add_comment` / `update_task` (→ `review`; only you mark Done).
5. `log_session` → files a structured work report.
6. `propose_brain_update` → lands a diff in your Approvals inbox.

`scripts/dogfood-demo.ts` runs exactly this loop headlessly if you want to see it without
Claude Code:

```bash
SHIP_FASTER_TOKEN=<worker token> node --env-file=.env.local --import tsx/esm scripts/dogfood-demo.ts
```

## Watch it in the dashboard
```bash
npm run dev    # http://localhost:3000
```
- **Today / Approvals** — the brain-diff the agent proposed is waiting for you.
- **Projects → ship-faster → Activity** — the session log and comments (once those screens ship).

> Dev note: the app currently uses the Supabase anon key (RLS is off). Add the real
> service-role key to `.env.local` and enable RLS at M7 before any non-local use.
