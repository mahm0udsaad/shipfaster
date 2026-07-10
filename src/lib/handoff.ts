import { serviceClient } from './db/client';

/**
 * A HANDOFF prompt for a specific task assigned to a specific agent.
 * Deliberately thin: it points the incoming agent at the task and tells it to pull the
 * context pack. The real handoff detail (what was done, what's next, gotchas) lives IN
 * the task — its description, acceptance criteria, and comments — surfaced by
 * get_context_pack. The prompt never carries that content, so it never goes stale.
 */
export async function buildHandoffPrompt(taskId: string): Promise<string> {
  const db = serviceClient();
  const { data: task } = await db
    .from('tasks')
    .select('id, title, project_id, projects(name, slug), agents!tasks_assignee_agent_id_fkey(name)')
    .eq('id', taskId)
    .maybeSingle();
  if (!task) return 'Task not found.';

  const project = (task as any).projects;
  const agentName = (task as any).agents?.name ?? 'the assigned agent';

  return `# ship-faster handoff — ${project?.name ?? ''}

You are **${agentName}**, a Worker agent on "${project?.name ?? ''}" in **ship-faster**. You are being **handed a task to continue**. Almost everything you need is inside the task, not this prompt.

## Do this
1. Connect to the **ship-faster MCP server** (project id \`${task.project_id}\`).
2. Call \`whoami\` to confirm you are ${agentName}.
3. Call \`get_context_pack(project_id: "${task.project_id}", task_id: "${task.id}")\`. **This is your handoff** — the task description, acceptance criteria, the prior agent's notes/comments, the Project Brain, and recent activity. Read it fully.
4. Tell the user what you picked up and your plan. Then set the task to \`in_progress\` with \`update_task\` and continue the work in the repo (follow the Conventions in the Brain).
5. You may only set the task to \`review\` — never \`done\` (the human closes it). End with \`log_session\` (include \`tokens_spent\`). Propose durable learnings via \`propose_brain_update\`.

Rules: work only this task; clients / money / Brain are proposal-only; never message the client. If anything is unclear, add a comment on the task and ask the user.
`;
}
