import { z } from 'zod';
import { defineTool } from '../lib/tool';
import { addComment, getTask, inScope } from '../../lib/db/repository';
import { forbidden, notFound } from '../lib/errors';

export const addCommentTool = defineTool({
  name: 'add_comment',
  description: {
    summary: 'Add a comment to a task thread.',
    useWhen: 'recording context a future session needs that is not brain-worthy, or explaining a status change.',
    doNotUseWhen: 'the note belongs in project memory — propose_brain_update instead. Workers may comment only on their own task.',
    sideEffects: 'inserts a comments row and an audited activity entry attributed to the caller.',
    returns: '{ comment: { id, created_at } }.',
    errors: 'NOT_FOUND (bad task id); FORBIDDEN_FOR_ROLE (worker commenting on another task, or out-of-scope project).',
  },
  input: z.object({ task_id: z.string().uuid(), body: z.string().min(1) }).strict(),
  allowedRoles: ['owner', 'project_lead', 'worker'],
  mutates: true,
  async handler({ ctx, input }) {
    const task = await getTask(ctx.projectScope, input.task_id);
    if (!task) throw notFound('task not found');
    if (!inScope(ctx, task.project_id)) throw forbidden('task out of token scope');
    if (ctx.role === 'worker' && task.assignee_agent_id !== ctx.agentId) {
      throw forbidden('workers may only comment on their own task');
    }
    const comment = await addComment(ctx, input.task_id, input.body);
    return { comment };
  },
});
