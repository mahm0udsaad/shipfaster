import { z } from 'zod';
import { defineTool } from '../lib/tool';
import { getTask, updateTask, inScope } from '../../lib/db/repository';
import { forbidden, notFound } from '../lib/errors';

export const claimTaskTool = defineTool({
  name: 'claim_task',
  description: {
    summary: 'Assign a task to yourself so you can work on it — the user picks it, you claim it.',
    useWhen: 'the user has chosen a task for you and you are about to start; call this before update_task/get_context_pack.',
    doNotUseWhen: 'the task is assigned to the human or another agent — ask the user first; do not take it.',
    sideEffects: 'sets the task assignee to you and writes an audited activity entry.',
    returns: '{ task } with you as the assignee.',
    errors: 'NOT_FOUND (bad id); FORBIDDEN_FOR_ROLE (out of scope, or the task belongs to a human/another agent).',
  },
  input: z.object({ task_id: z.string().uuid() }).strict(),
  allowedRoles: ['owner', 'project_lead', 'worker'],
  mutates: true,
  async handler({ ctx, input }) {
    const task = await getTask(ctx, input.task_id);
    if (!task) throw notFound('task not found');
    if (!inScope(ctx, task.project_id)) throw forbidden('task out of token scope');

    // A worker may only claim a task that is free (not a human's, not another agent's).
    if (ctx.role === 'worker') {
      if (task.assignee_is_human) throw forbidden('task is assigned to the human — ask them to hand it over');
      if (task.assignee_agent_id && task.assignee_agent_id !== ctx.agentId) {
        throw forbidden('task is already assigned to another agent');
      }
    }

    const updated = await updateTask(
      ctx,
      input.task_id,
      { assignee_agent_id: ctx.agentId, assignee_is_human: false, updated_at: new Date().toISOString() },
      'self-assigned (claimed)',
    );
    return { task: updated };
  },
});
