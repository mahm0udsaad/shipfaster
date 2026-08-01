-- Content calendar — the media buyer's scheduling surface.
--
-- A post is a piece of content planned for a moment in time: title, optional creative,
-- body copy, and a slot. It hangs off a project when the content belongs to a client
-- (project_id), and stands alone when it does not — hence nullable, like activity.project_id.
--
-- Tenancy follows 0004/0005 exactly: an account_id anchor stamped by the repository layer,
-- plus the same RLS policy shape. Adding the table without both would make it the one
-- tenant table a cross-account read could walk through.

create type content_status  as enum ('idea', 'draft', 'scheduled', 'published');
create type content_channel as enum (
  'instagram', 'facebook', 'tiktok', 'x', 'linkedin', 'youtube', 'email', 'blog', 'other'
);

create table content_posts (
  id                 uuid primary key default gen_random_uuid(),
  account_id         uuid not null references accounts(id) on delete cascade,
  project_id         uuid references projects(id) on delete set null,  -- optional: whose content
  title              text not null,
  body               text,                                             -- the caption / copy
  -- Two ways to attach a creative, and they are different things:
  --   image_path — an object in the private `content-media` bucket (uploaded here). Rendered
  --                through a short-lived signed URL; never a permanent public link.
  --   image_url  — an external link the buyer pasted (Drive, CDN, the client's own asset).
  image_path         text,
  image_url          text,
  channel            content_channel not null default 'instagram',
  status             content_status not null default 'scheduled',
  scheduled_at       timestamptz not null,                             -- the slot, in UTC
  created_by_agent_id uuid references agents(id) on delete set null,   -- null = the human
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- The calendar's only read shape: "my account's posts between two instants, in slot order".
create index content_posts_account_slot_idx on content_posts(account_id, scheduled_at);
create index content_posts_project_idx      on content_posts(project_id);

-- ---------- RLS (same shape as 0005) ----------
alter table content_posts enable row level security;
drop policy if exists content_posts_tenant_isolation on content_posts;
create policy content_posts_tenant_isolation on content_posts
  for all
  to authenticated
  using (account_id in (select ship_faster_account_ids()))
  with check (account_id in (select ship_faster_account_ids()));

-- ---------- creative storage ----------
-- PRIVATE on purpose. Creatives are client assets; a public bucket would make every upload a
-- permanent unauthenticated URL that outlives the post it belongs to. Uploads and reads both
-- go through the server (service role), which hands the browser a signed URL that expires —
-- so no storage policy grants the anon/authenticated roles anything here.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'content-media',
  'content-media',
  false,
  10485760,                                                            -- 10 MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;
