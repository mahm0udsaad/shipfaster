import { z } from 'zod';
import { defineTool } from '../lib/tool';
import { listTasks, inScope } from '../../lib/db/repository';
import { forbidden } from '../lib/errors';

const STATUS = ['todo', 'in_progress', 'blocked', 'review', 'done', 'cancelled'] as const;

export const listTasksTool = defineTool({
  name: 'list_tasks',
  description: {
    summary: 'List tasks, filterable by project, status, assignee, and due date.',
    useWhen: 'you need the current task list or want to check status of related work.',
    doNotUseWhen: 'you want full context for one task to start work — use get_context_pack.',
    sideEffects: 'none.',
    returns: '{ tasks: [{ id, project_id, title, status, priority, assignee_agent_id, due_at }] }.',
    errors: 'FORBIDDEN_FOR_ROLE if project_id is outside token scope. Empty list is valid, not an error.',
  },
  input: z
    .object({
      project_id: z.string().uuid().optional(),
      status: z.enum(STATUS).optional(),
      assignee_agent_id: z.string().uuid().optional(),
      due_before: z.string().datetime().optional(),
    })
    .strict(),
  allowedRoles: ['owner', 'project_lead', 'worker'],
  mutates: false,
  async handler({ ctx, input }) {
    if (input.project_id && !inScope(ctx, input.project_id)) throw forbidden('project out of token scope');
    const rows = await listTasks(ctx, {
      projectId: input.project_id,
      status: input.status,
      assigneeAgentId: input.assignee_agent_id,
      dueBefore: input.due_before,
    });
    return {
      tasks: rows.map((t: any) => ({
        id: t.id,
        project_id: t.project_id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        assignee_agent_id: t.assignee_agent_id,
        due_at: t.due_at,
      })),
    };
  },
});
