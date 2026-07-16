-- Agent-to-agent mentions + durable inbox.
-- An @mention in a comment drops a notification row for each mentioned agent.
-- Agents pull their inbox on start (get_inbox) and park on a long-poll (wait_for_mentions)
-- so an idle agent "wakes" the moment it is mentioned. ship-faster stays a coordination
-- layer — it stores and serves the signal; it does not host/relaunch the agent process.

create type notification_kind as enum ('mention');

create table notifications (
  id                 uuid primary key default gen_random_uuid(),
  recipient_agent_id uuid not null references agents(id) on delete cascade,
  actor_agent_id     uuid references agents(id) on delete set null,   -- who mentioned (null = human/owner)
  project_id         uuid references projects(id) on delete cascade,
  task_id            uuid references tasks(id) on delete set null,
  comment_id         uuid references comments(id) on delete cascade,
  kind               notification_kind not null default 'mention',
  body               text not null,                                   -- comment snippet for context
  read_at            timestamptz,
  created_at         timestamptz not null default now()
);

-- The long-poll and inbox both read "my unread, newest first" — this index serves both.
create index notifications_recipient_idx
  on notifications(recipient_agent_id, created_at desc);
create index notifications_unread_idx
  on notifications(recipient_agent_id) where read_at is null;
