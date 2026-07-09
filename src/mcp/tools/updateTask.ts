import { z } from 'zod';
import { defineTool } from '../lib/tool';
import { updateTask, getTask, inScope } from '../../lib/db/repository';
import { forbidden, notFound } from '../lib/errors';

// Which statuses each role may set. Workers can NEVER set 'done' — only the human closes tasks.
const WORKER_STATUSES = new Set(['in_progress', 'blocked', 'review']);

export const updateTaskTool = defineTool({
  name: 'update_task',
  description: {
    summary: 'Update a task: status, priority, assignee, due date, or acceptance criteria.',
    useWhen: 'moving a task forward, reprioritizing, or assigning it.',
    doNotUseWhen: 'you want to add a note — use add_comment. Workers may set only in_progress/blocked/review on their OWN task, never done.',
    sideEffects: 'updates the tasks row and writes an audited activity entry with the given reason.',
    returns: '{ task: { id, status, ... } }.',
    errors: 'NOT_FOUND (bad id); FORBIDDEN_FOR_ROLE (worker setting done, editing another task, or out-of-scope project).',
  },
  input: z
    .object({
      task_id: z.string().uuid(),
      status: z.enum(['todo', 'in_progress', 'blocked', 'review', 'done', 'cancelled']).optional(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
      assignee_agent_id: z.string().uuid().nullable().optional(),
      due_at: z.string().datetime().nullable().optional(),
      acceptance_criteria: z.string().optional(),
      reason: z.string().optional(),
    })
    .strict(),
  allowedRoles: ['owner', 'project_lead', 'worker'],
  mutates: true,
  async handler({ ctx, input }) {
    const task = await getTask(ctx.projectScope, input.task_id);
    if (!task) throw notFound('task not found');
    if (!inScope(ctx, task.project_id)) throw forbidden('task out of token scope');

    if (ctx.role === 'worker') {
      if (task.assignee_agent_id !== ctx.agentId) throw forbidden('workers may only update their own task');
      if (input.status && !WORKER_STATUSES.has(input.status)) {
        throw forbidden(`workers may not set status '${input.status}' (only in_progress/blocked/review)`);
      }
      if (input.assignee_agent_id !== undefined || input.priority || input.due_at !== undefined) {
        throw forbidden('workers may change only status/acceptance on their own task');
      }
    }

    // Project Lead: don't touch a task the human edited in the last 24h without approval.
    if (ctx.role === 'project_lead' && task.human_touched_at) {
      const ageMs = Date.now() - new Date(task.human_touched_at).getTime();
      if (ageMs < 24 * 60 * 60 * 1000) {
        throw forbidden('human edited this task <24h ago; request_approval before changing it');
      }
    }

    const patch: Record<string, unknown> = {};
    if (input.status !== undefined) patch.status = input.status;
    if (input.priority !== undefined) patch.priority = input.priority;
    if (input.assignee_agent_id !== undefined) patch.assignee_agent_id = input.assignee_agent_id;
    if (input.due_at !== undefined) patch.due_at = input.due_at;
    if (input.acceptance_criteria !== undefined) patch.acceptance_criteria = input.acceptance_criteria;
    patch.updated_at = new Date().toISOString();
    if (ctx.actorType === 'human') patch.human_touched_at = new Date().toISOString();

    const updated = await updateTask(ctx, input.task_id, patch, input.reason);
    return { task: updated };
  },
});
