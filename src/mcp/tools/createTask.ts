import { z } from 'zod';
import { defineTool } from '../lib/tool';
import { createTask, getTask, inScope } from '../../lib/db/repository';
import { forbidden, validation } from '../lib/errors';

export const createTaskTool = defineTool({
  name: 'create_task',
  description: {
    summary: 'Create a task, or a subtask under an existing task; pass tokens_spent to record what creating it cost you.',
    useWhen: 'the Project Lead is breaking down work, or a Worker is splitting its assigned task into subtasks.',
    doNotUseWhen: 'you only need to change an existing task — use update_task. Workers may NOT create top-level tasks.',
    sideEffects: 'inserts a tasks row and an audited activity entry attributed to the caller.',
    returns: '{ task: { id, ... } } — the new id, for assigning or commenting next.',
    errors: 'FORBIDDEN_FOR_ROLE (worker creating a top-level task, or project out of scope); VALIDATION (missing parent for worker).',
  },
  input: z
    .object({
      project_id: z.string().uuid(),
      title: z.string().min(1),
      description: z.string().optional(),
      acceptance_criteria: z.string().optional(),
      parent_task_id: z.string().uuid().optional(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
      due_at: z.string().datetime().optional(),
      tokens_spent: z.number().int().min(0).optional(),
    })
    .strict(),
  allowedRoles: ['owner', 'project_lead', 'worker'],
  mutates: true,
  async handler({ ctx, input }) {
    if (!inScope(ctx, input.project_id)) throw forbidden('project out of token scope');

    // Workers may only create subtasks of their own task, never top-level tasks.
    if (ctx.role === 'worker') {
      if (!input.parent_task_id) throw forbidden('workers may only create subtasks (parent_task_id required)');
      const parent = await getTask(ctx, input.parent_task_id);
      if (!parent) throw validation('parent task not found');
      if (parent.assignee_agent_id !== ctx.agentId) throw forbidden('workers may only subtask their own task');
    }

    const task = await createTask(ctx, {
      projectId: input.project_id,
      title: input.title,
      description: input.description,
      acceptanceCriteria: input.acceptance_criteria,
      parentTaskId: input.parent_task_id,
      priority: input.priority,
      dueAt: input.due_at,
      tokensSpent: input.tokens_spent,
    });
    return { task };
  },
});
