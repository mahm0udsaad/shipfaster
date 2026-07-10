-- Agent token accounting: record who created a task and how many tokens it cost.
alter table tasks add column created_by_agent_id uuid references agents(id) on delete set null;
alter table tasks add column tokens_spent int not null default 0;
alter table session_logs add column tokens_spent int not null default 0;

-- backfill task creators from the activity audit trail
update tasks t
set created_by_agent_id = a.actor_agent_id
from activity a
where a.task_id = t.id and a.verb = 'task.created' and a.actor_agent_id is not null;
