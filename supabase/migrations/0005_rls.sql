-- M7 phase 2 — Row Level Security.
--
-- 0004 deliberately stopped short of this: with every query on the service-role key, RLS
-- would have been decoration. The repository layer now mints a short-lived per-actor JWT
-- (src/lib/db/actor-token.ts) and runs queries through it, so policies finally bind.
--
-- The two actors reach the database along different paths, and a policy must cover BOTH:
--
--   agents + OWNER_TOKEN → a self-signed JWT carrying an `account_id` claim. They are not
--                          auth.users rows, so auth.uid() is null for them.
--   dashboard humans     → a real Supabase Auth session. No account_id claim; their account
--                          is resolved through account_members.
--
-- This is defense-in-depth, NOT the primary control. The repository account filter still
-- runs, because the service-role key legitimately bypasses everything below (migrations,
-- auth-time agent lookup) and any code path that regresses onto it must stay safe.

-- ---------- who is asking ----------
-- SECURITY DEFINER so the account_members lookup inside a policy does not itself get
-- filtered by account_members' own policy — that would recurse. It reads only ids.
-- STABLE so the planner calls it once per query rather than once per row.
create or replace function ship_faster_account_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  -- Agent / owner token: the account travels as a signed claim.
  select nullif(auth.jwt() ->> 'account_id', '')::uuid
  where nullif(auth.jwt() ->> 'account_id', '') is not null
  union
  -- Human: resolve through membership. auth.uid() is null for agents, so this yields
  -- nothing for them rather than leaking another account.
  select am.account_id
  from account_members am
  where am.user_id = auth.uid();
$$;

revoke all on function ship_faster_account_ids() from public;
grant execute on function ship_faster_account_ids() to authenticated;

-- ---------- tenant tables ----------
-- One uniform policy shape per table: a row is reachable iff its account_id is one of the
-- caller's. USING covers read/update/delete visibility; WITH CHECK stops a caller writing a
-- row stamped with someone else's account.
do $$
declare t text;
begin
  foreach t in array array[
    'clients', 'projects', 'agents', 'tasks', 'milestones', 'comments',
    'activity', 'session_logs', 'brain_sections', 'brain_diffs', 'approvals', 'notifications'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_tenant_isolation', t);
    execute format($f$
      create policy %I on %I
        for all
        to authenticated
        using (account_id in (select ship_faster_account_ids()))
        with check (account_id in (select ship_faster_account_ids()))
    $f$, t || '_tenant_isolation', t);
  end loop;
end $$;

-- ---------- the tenancy tables themselves ----------
-- `accounts` has no account_id (it IS the account), so it is matched on id.
alter table accounts enable row level security;
drop policy if exists accounts_self on accounts;
create policy accounts_self on accounts
  for select
  to authenticated
  using (id in (select ship_faster_account_ids()));

-- Membership is readable only for accounts you already belong to. Writes stay off the
-- authenticated role entirely: adding a member is an admin action and must go through the
-- service-role path, never through an agent's token.
alter table account_members enable row level security;
drop policy if exists account_members_self on account_members;
create policy account_members_self on account_members
  for select
  to authenticated
  using (account_id in (select ship_faster_account_ids()));

-- ---------- indexes backing the policy predicate ----------
-- account_members is hit once per query via the helper; make that lookup an index seek.
create index if not exists account_members_user_account_idx
  on account_members(user_id, account_id);

-- ---------- notes ----------
-- The `anon` role is granted nothing here: with no policy for it, RLS denies by default.
-- The publishable key alone therefore reads nothing, which is what makes it safe to ship to
-- a browser. Verify with tests/db/rls.test.ts before trusting that claim.
