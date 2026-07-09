-- ship-faster core schema (M0)
-- 11 tables per docs/development-plan.md §M0 and docs/section-18-19 §18.12.
-- All access goes through src/lib/db/repository.ts. RLS policies land in a later migration (M7).

-- ---------- enums ----------
create type agent_role      as enum ('owner', 'project_lead', 'worker', 'intake', 'brain_sync');
create type project_status  as enum ('active', 'paused', 'archived');
create type task_status     as enum ('todo', 'in_progress', 'blocked', 'review', 'done', 'cancelled');
create type task_priority   as enum ('low', 'medium', 'high', 'urgent');
create type milestone_status as enum ('pending', 'invoiced', 'paid');
create type brain_section_key as enum (
  'current_state', 'decisions', 'conventions', 'environment', 'client_notes', 'open_questions'
);
create type diff_operation   as enum ('add', 'update', 'remove');
create type diff_status      as enum ('proposed', 'approved', 'rejected', 'merged');
create type approval_kind    as enum ('brain_diff', 'client_message', 'task_plan', 'scope', 'other');
create type approval_status  as enum ('open', 'approved', 'rejected');
create type actor_type       as enum ('human', 'agent');

-- ---------- clients ----------
create table clients (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  contact       jsonb not null default '{}'::jsonb,   -- {email, whatsapp, notes}
  comms_channel text,                                  -- 'whatsapp' | 'email' | 'calls'
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------- projects ----------
create table projects (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid references clients(id) on delete set null,
  name         text not null,
  slug         text unique not null,
  status       project_status not null default 'active',
  pricing_model text,                                  -- 'fixed' | 'retainer' | 'mixed'
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------- agents (identity + permissions) ----------
create table agents (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  role          agent_role not null,
  token_hash    text unique not null,                  -- sha256 of the bearer token; never store raw
  project_scope uuid[] not null default '{}',          -- empty = all projects (owner/lead); else worker-scoped
  writes_per_hour int not null default 30,
  created_at    timestamptz not null default now(),
  last_active_at timestamptz,
  revoked_at    timestamptz
);

-- ---------- tasks ----------
create table tasks (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null references projects(id) on delete cascade,
  parent_task_id      uuid references tasks(id) on delete cascade,
  title               text not null,
  description         text,
  acceptance_criteria text,                            -- required before a task may be worker-assigned
  status              task_status not null default 'todo',
  priority            task_priority not null default 'medium',
  assignee_agent_id   uuid references agents(id) on delete set null,
  assignee_is_human   boolean not null default false,
  due_at              timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  human_touched_at    timestamptz                      -- guards the "don't touch what the human edited <24h ago" rule
);
create index tasks_project_idx  on tasks(project_id);
create index tasks_status_idx   on tasks(status);
create index tasks_assignee_idx on tasks(assignee_agent_id);

-- ---------- milestones (money-aware) ----------
create table milestones (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  title       text not null,
  amount      numeric(12,2) not null default 0,
  currency    text not null default 'USD',
  status      milestone_status not null default 'pending',
  due_at      timestamptz,
  paid_at     timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index milestones_project_idx on milestones(project_id);

-- ---------- comments ----------
create table comments (
  id             uuid primary key default gen_random_uuid(),
  task_id        uuid not null references tasks(id) on delete cascade,
  actor_type     actor_type not null,
  actor_agent_id uuid references agents(id) on delete set null,
  body           text not null,
  created_at     timestamptz not null default now()
);
create index comments_task_idx on comments(task_id);

-- ---------- activity (append-only audit) ----------
create table activity (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid references projects(id) on delete cascade,
  task_id        uuid references tasks(id) on delete set null,
  actor_type     actor_type not null,
  actor_agent_id uuid references agents(id) on delete set null,
  verb           text not null,                        -- 'task.created', 'task.status_changed', ...
  summary        text not null,
  reason         text,
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);
create index activity_project_idx on activity(project_id, created_at desc);

-- ---------- session_logs (agent work journal) ----------
create table session_logs (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references projects(id) on delete cascade,
  task_id        uuid references tasks(id) on delete set null,
  agent_id       uuid references agents(id) on delete set null,
  summary        text not null,
  changes        jsonb not null default '[]'::jsonb,   -- [{type:'file'|'pr', ref, note}]
  tests_status   text,
  blocked_on     text,
  next_step      text,
  created_at     timestamptz not null default now()
);
create index session_logs_project_idx on session_logs(project_id, created_at desc);

-- ---------- brain_sections (project memory) ----------
create table brain_sections (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  section     brain_section_key not null,
  body        text not null default '',
  version     int not null default 1,
  updated_at  timestamptz not null default now(),
  unique (project_id, section)
);
-- full-text search over brain bodies (no pgvector in MVP)
alter table brain_sections add column body_tsv tsvector
  generated always as (to_tsvector('english', coalesce(body, ''))) stored;
create index brain_sections_fts_idx on brain_sections using gin(body_tsv);

-- ---------- brain_diffs (staged memory updates) ----------
create table brain_diffs (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references projects(id) on delete cascade,
  section        brain_section_key not null,
  operation      diff_operation not null,
  before_text    text,
  after_text     text,
  evidence_session_log_id uuid references session_logs(id) on delete set null,
  proposed_by_agent_id    uuid references agents(id) on delete set null,
  status         diff_status not null default 'proposed',
  created_at     timestamptz not null default now(),
  resolved_at    timestamptz
);
create index brain_diffs_project_idx on brain_diffs(project_id, status);

-- ---------- approvals (single human-in-the-loop inbox) ----------
create table approvals (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid references projects(id) on delete cascade,
  kind           approval_kind not null,
  title          text not null,
  payload        jsonb not null default '{}'::jsonb,   -- draft text, brain_diff_id, proposed task mutations
  requested_by_agent_id uuid references agents(id) on delete set null,
  status         approval_status not null default 'open',
  created_at     timestamptz not null default now(),
  resolved_at    timestamptz,
  resolution_note text
);
create index approvals_status_idx on approvals(status, created_at desc);
