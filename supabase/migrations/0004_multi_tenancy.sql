-- M7 phase 1 — multi-tenancy foundation.
--
-- STRUCTURE ONLY. This migration adds accounts, membership, and an account_id anchor on
-- every tenant table, then backfills the existing single-tenant data into one account.
-- It deliberately does NOT enable RLS or add policies — that lands in 0005 once the
-- repository layer threads a per-actor client (otherwise the service-role key bypasses
-- policies anyway and we'd get a false sense of safety).
--
-- Why account_id is denormalized onto every table rather than derived via project_id:
--   * activity.project_id, approvals.project_id and notifications.project_id are NULLABLE
--     and comments has no project_id at all — those rows have no project to derive from,
--     so a join-based policy would leave them unreachable/orphaned.
--   * policies stay index-backed equality checks instead of recursive subqueries.
-- The cost is that every insert must set account_id; the repository layer is the single
-- writer, so that is enforced in one place.

-- ---------- plans + membership roles ----------
create type account_plan as enum ('solo', 'pro', 'agency');   -- Solo free / Pro $19 / Agency $49
create type account_role as enum ('owner', 'admin', 'member');

create table accounts (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null,
  plan                   account_plan not null default 'solo',
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- People. Agents authenticate by token (agents.token_hash); humans authenticate by
-- Supabase Auth and reach an account through this join table.
create table account_members (
  account_id uuid not null references accounts(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       account_role not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (account_id, user_id)
);
create index account_members_user_idx on account_members(user_id);

-- ---------- 1. add the anchor (nullable first, so existing rows survive) ----------
alter table clients        add column account_id uuid references accounts(id) on delete cascade;
alter table projects       add column account_id uuid references accounts(id) on delete cascade;
alter table agents         add column account_id uuid references accounts(id) on delete cascade;
alter table tasks          add column account_id uuid references accounts(id) on delete cascade;
alter table milestones     add column account_id uuid references accounts(id) on delete cascade;
alter table comments       add column account_id uuid references accounts(id) on delete cascade;
alter table activity       add column account_id uuid references accounts(id) on delete cascade;
alter table session_logs   add column account_id uuid references accounts(id) on delete cascade;
alter table brain_sections add column account_id uuid references accounts(id) on delete cascade;
alter table brain_diffs    add column account_id uuid references accounts(id) on delete cascade;
alter table approvals      add column account_id uuid references accounts(id) on delete cascade;
alter table notifications  add column account_id uuid references accounts(id) on delete cascade;

-- ---------- 2. backfill: all existing data belongs to one account ----------
-- NOTE: account_members is intentionally left empty here — there are no auth.users yet.
-- The first human to sign up is linked to this account in the auth phase (0006).
do $$
declare acct uuid;
begin
  insert into accounts (name, plan) values ('Mahmoud', 'agency') returning id into acct;

  update clients        set account_id = acct where account_id is null;
  update projects       set account_id = acct where account_id is null;
  update agents         set account_id = acct where account_id is null;
  update tasks          set account_id = acct where account_id is null;
  update milestones     set account_id = acct where account_id is null;
  update comments       set account_id = acct where account_id is null;
  update activity       set account_id = acct where account_id is null;
  update session_logs   set account_id = acct where account_id is null;
  update brain_sections set account_id = acct where account_id is null;
  update brain_diffs    set account_id = acct where account_id is null;
  update approvals      set account_id = acct where account_id is null;
  update notifications  set account_id = acct where account_id is null;
end $$;

-- ---------- 3. lock it down ----------
alter table clients        alter column account_id set not null;
alter table projects       alter column account_id set not null;
alter table agents         alter column account_id set not null;
alter table tasks          alter column account_id set not null;
alter table milestones     alter column account_id set not null;
alter table comments       alter column account_id set not null;
alter table activity       alter column account_id set not null;
alter table session_logs   alter column account_id set not null;
alter table brain_sections alter column account_id set not null;
alter table brain_diffs    alter column account_id set not null;
alter table approvals      alter column account_id set not null;
alter table notifications  alter column account_id set not null;

-- ---------- 4. uniqueness that was single-tenant by accident ----------
-- A global unique slug means two accounts could never both run a project called
-- "bookitfly". Scope it to the account instead.
alter table projects drop constraint projects_slug_key;
alter table projects add constraint projects_slug_account_uniq unique (account_id, slug);

-- Agent names resolve @mentions (resolveAgentsByName). Unscoped, an @mention could match
-- another account's agent. Names are unique per account; lookups must filter by account.
alter table agents add constraint agents_name_account_uniq unique (account_id, name);

-- ---------- 5. indexes to back the tenancy filter (and the coming RLS policies) ----------
create index clients_account_idx        on clients(account_id);
create index projects_account_idx       on projects(account_id);
create index agents_account_idx         on agents(account_id);
create index tasks_account_idx          on tasks(account_id);
create index milestones_account_idx     on milestones(account_id);
create index comments_account_idx       on comments(account_id);
create index activity_account_idx       on activity(account_id, created_at desc);
create index session_logs_account_idx   on session_logs(account_id, created_at desc);
create index brain_sections_account_idx on brain_sections(account_id);
create index brain_diffs_account_idx    on brain_diffs(account_id);
create index approvals_account_idx      on approvals(account_id, status);
create index notifications_account_idx  on notifications(account_id);
