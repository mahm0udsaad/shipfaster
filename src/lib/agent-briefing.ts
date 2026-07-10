import { ownerContext } from './dashboard';
import { getProject, getBrain, listTasks } from './db/repository';

/**
 * Build a self-contained onboarding prompt for a fresh agent (Claude Code / Cursor / Codex)
 * joining a project through ship-faster. Deterministic assembly from the live DB — the Brain,
 * the open tasks, and the operating rules — so an agent can be pasted in and start immediately.
 */

const SECTION_ORDER = ['current_state', 'decisions', 'conventions', 'environment', 'client_notes', 'open_questions'];
const SECTION_LABEL: Record<string, string> = {
  current_state: 'Current state',
  decisions: 'Decisions',
  conventions: 'Conventions',
  environment: 'Environment',
  client_notes: 'Client notes',
  open_questions: 'Open questions',
};
const OPEN = ['todo', 'in_progress', 'blocked', 'review'];

export async function buildAgentBriefing(projectId: string): Promise<string> {
  const [project, brain, tasks] = await Promise.all([
    getProject(ownerContext, projectId),
    getBrain(projectId),
    listTasks(ownerContext, { projectId }),
  ]);
  if (!project) return 'Project not found.';

  const client = (project as any).clients?.name ?? '—';
  const bySection = new Map(brain.map((s: any) => [s.section, s]));
  const open = (tasks as any[]).filter((t) => OPEN.includes(t.status));
  const byStatus = (s: string) => open.filter((t) => t.status === s);

  const brainMd = SECTION_ORDER.map((key) => {
    const s = bySection.get(key) as any;
    const body = s?.body?.trim();
    return `### ${SECTION_LABEL[key]}\n${body || '_(empty — seed this if you learn something durable)_'}`;
  }).join('\n\n');

  const taskLine = (t: any) => {
    const who = t.assignee_is_human ? 'human' : t.assignee_agent_id ? 'an agent' : 'unassigned';
    const crit = t.acceptance_criteria
      ? `\n  acceptance: ${t.acceptance_criteria.replace(/\n/g, '; ')}`
      : '';
    return `- [${t.status}] ${t.title}  (id: ${t.id}, assignee: ${who}, priority: ${t.priority})${crit}`;
  };

  const tasksMd = ['todo', 'in_progress', 'blocked', 'review']
    .map((s) => {
      const list = byStatus(s);
      if (!list.length) return '';
      return `**${s.replace('_', ' ')} (${list.length})**\n${list.map(taskLine).join('\n')}`;
    })
    .filter(Boolean)
    .join('\n\n');

  return `# ship-faster briefing — ${project.name}

You are a **Worker agent** on the "${project.name}" project (client: ${client}) inside **ship-faster**, an agent-native project manager. Your job: work one task at a time in the repository and report back. Read this brief fully. **Do not start working until the user has chosen a task** — your first action is to present the open tasks and let them pick.

## Connect
This project is served by the **ship-faster MCP server**. Project id: \`${projectId}\` (slug: \`${project.slug}\`).
Tools you can call: \`get_context_pack\`, \`get_project\`, \`list_tasks\`, \`get_brain\`, \`search\`, \`update_task\`, \`add_comment\`, \`create_task\` (subtasks of your own task), \`log_session\`, \`propose_brain_update\`, \`request_approval\`.
**Always start** by calling \`get_context_pack(project_id: "${projectId}", task_id: <your task>)\` — it briefs you with the Brain, the task, and recent history.

## Operating rules (read carefully)
- You may move **your** task between \`in_progress\` / \`blocked\` / \`review\`. You may **NOT** mark a task \`done\` — only the human closes tasks. When your work is ready for review, set it to \`review\`.
- Anything touching **clients, money, or the Brain is proposal-only**: use \`propose_brain_update\` (diffs) and \`request_approval\`. Never write the Brain directly, never message the client, never change milestones.
- **End every session** with \`log_session\` (summary, files/PRs changed, tests status, next step).
- You may create at most 5 sub-tasks, and only under your own task. Do not touch tasks you are not assigned.
- If acceptance criteria conflict with the Brain, or scope grows beyond the criteria, call \`request_approval\` and wait.

## Project Brain
${brainMd}

## Open tasks
${tasksMd || '_(no open tasks right now)_'}

## Start here — pick a task WITH the user first
1. **Do not choose a task yourself.** Present the open tasks above to the user as a short numbered list — each with its status and a one-line summary — and ask which one they want you to work on. If \`list_tasks\` is available, you may refresh the list first so it is current.
2. Once the user chooses, call \`get_context_pack(project_id: "${projectId}", task_id: <their choice>)\` and read the pack.
3. Set that task to \`in_progress\`, then do the work in the repo following the Conventions above.
4. When it is ready for the human, set the task to \`review\` and call \`log_session\`. Propose any durable learnings to the Brain via \`propose_brain_update\`.
`;
}
