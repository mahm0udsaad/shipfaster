-- Human roles, part 2 of 2 — RLS that knows what a media buyer may touch.
--
-- THE HOLE THIS CLOSES
-- 0005 gave every authenticated caller access to their whole account: one policy shape,
-- "your account_id matches mine". That was right when the only humans were owners. A media
-- buyer with a real Supabase session breaks it: their browser holds an access token, and
-- PostgREST is a public endpoint, so `select * from milestones` with that token would return
-- the account's entire billing history no matter what the Next.js routes allow. Hiding the
-- Money page is a UI decision; this file is the actual control.
--
-- THE SHAPE
--   ship_faster_account_ids()      — every account the caller belongs to, any role. Content.
--   ship_faster_full_account_ids() — accounts where the caller is owner/admin/member, plus
--                                    any agent-token account. Everything else.
-- Agents are unaffected: they authenticate by a signed account_id claim and have no
-- account_members row, so both functions return the same thing for them.

create or replace function ship_faster_full_account_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  -- Agent / owner token: unchanged from 0005. Agent permissions are enforced per-tool by the
  -- MCP layer's allowedRoles, not here.
  select nullif(auth.jwt() ->> 'account_id', '')::uuid
  where nullif(auth.jwt() ->> 'account_id', '') is not null
  union
  -- Humans: full access is a property of the membership role, not of being signed in.
  select am.account_id
  from account_members am
  where am.user_id = auth.uid()
    and am.role in ('owner', 'admin', 'member');
$$;

revoke all on function ship_faster_full_account_ids() from public;
grant execute on function ship_faster_full_account_ids() to authenticated;

-- ---------- everything a media buyer must NOT reach ----------
-- Same policy shape as 0005, one predicate stricter. content_posts is deliberately absent:
-- it keeps the broad any-member policy, because that is the media buyer's whole job.
do $$
declare t text;
begin
  foreach t in array array[
    'clients', 'projects', 'agents', 'tasks', 'milestones', 'comments',
    'activity', 'session_logs', 'brain_sections', 'brain_diffs', 'approvals', 'notifications'
  ]
  loop
    execute format('drop policy if exists %I on %I', t || '_tenant_isolation', t);
    execute format($f$
      create policy %I on %I
        for all
        to authenticated
        using (account_id in (select ship_faster_full_account_ids()))
        with check (account_id in (select ship_faster_full_account_ids()))
    $f$, t || '_tenant_isolation', t);
  end loop;
end $$;

-- ---------- the one exception: project names ----------
-- The calendar labels posts with their project and filters by it, so a media buyer must be
-- able to READ projects in their account. Permissive policies OR together, so this widens
-- the stricter policy above for SELECT only — no insert/update/delete, and nothing about
-- other tables. Project rows carry a name, slug and status; no money and no client contact.
drop policy if exists projects_content_read on projects;
create policy projects_content_read on projects
  for select
  to authenticated
  using (account_id in (select ship_faster_account_ids()));

-- ---------- activity written by a media buyer ----------
-- Scheduling a post writes an activity row (repository.recordActivity). The stricter policy
-- above would refuse that insert and fail the write, so allow members of the account to
-- append content.* activity — and only that. Reading activity stays owner-only.
drop policy if exists activity_content_append on activity;
create policy activity_content_append on activity
  for insert
  to authenticated
  with check (
    account_id in (select ship_faster_account_ids())
    and verb like 'content.%'
  );

-- ---------- notes ----------
-- Verify with scripts/verify-media-buyer.ts, which signs in as a real media buyer and checks
-- that milestones/tasks/clients come back empty while content_posts works.
