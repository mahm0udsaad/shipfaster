# LATER — deliberately out of scope until after MVP validation

Per docs/section-18-19 §18.4/§18.5. If tempted to build any of these before the eval
harness (M5) proves the core loop, write the idea here instead of in code.

- Hosted worker/coding agents (Claude Code IS the worker; we give it a role contract).
- Autonomous client communication (agents draft; the human sends — always).
- Time tracking / invoicing (money-aware milestones cover "what's owed").
- pgvector / semantic memory (structured brain + full-text search is enough for now).
- Agent Skills (pluggable per-agent capabilities) — needs ≥2 real roles + observed repetition.
- Auto-ingesting Intake Agent (MVP is a Paste → Tasks review screen).
- Client portal, LLM-compressed context packs, cross-project brain search.

## Built anyway — this list was wrong

Kept honest on purpose: a stale guardrail is worse than none, because agents read this file
as context and will believe it.

- **Agent-to-agent mentions** — shipped (`0003_notifications.sql`, `get_inbox`,
  `wait_for_mentions`, `mark_read`). The claim that "tasks + comments are the message bus"
  did not survive contact with an idle agent that needed waking.
- **Multi-tenancy** — shipped (`0004`, `0005`): accounts, membership, account-scoped
  repository, RLS, per-agent tokens. Not because teams were needed, but because the
  single-tenant assumption was silently unsafe (see the anon-key note in the README).
  Multi-USER (human auth, invites, roles) is still genuinely out of scope.
