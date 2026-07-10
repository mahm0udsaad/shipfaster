import { z } from 'zod';
import { defineTool } from '../lib/tool';
import { logSession, getTask, inScope } from '../../lib/db/repository';
import { forbidden } from '../lib/errors';

export const logSessionTool = defineTool({
  name: 'log_session',
  description: {
    summary: 'File a structured work report at the end of a session: what changed, test status, blockers, next step, and tokens_spent.',
    useWhen: 'ending any work session — every Worker session MUST end with this; the Project Lead logs each triage run.',
    doNotUseWhen: 'mid-session for a quick note — use add_comment. This is the terminal report, not a running log.',
    sideEffects: 'inserts a session_logs row and an audited activity entry; feeds Brain Sync and staleness metrics.',
    returns: '{ session_log: { id } } — reference it as evidence in propose_brain_update.',
    errors: 'FORBIDDEN_FOR_ROLE (project out of scope, or worker logging against a task it does not own).',
  },
  input: z
    .object({
      project_id: z.string().uuid(),
      task_id: z.string().uuid().optional(),
      summary: z.string().min(1),
      changes: z.array(z.record(z.any())).optional(),
      tests_status: z.string().optional(),
      blocked_on: z.string().optional(),
      next_step: z.string().optional(),
      tokens_spent: z.number().int().min(0).optional(),
    })
    .strict(),
  allowedRoles: ['owner', 'project_lead', 'worker'],
  mutates: true,
  async handler({ ctx, input }) {
    if (!inScope(ctx, input.project_id)) throw forbidden('project out of token scope');
    if (ctx.role === 'worker' && input.task_id) {
      const task = await getTask(ctx.projectScope, input.task_id);
      if (task && task.assignee_agent_id !== ctx.agentId) {
        throw forbidden('workers may only log sessions against their own task');
      }
    }
    const session = await logSession(ctx, {
      projectId: input.project_id,
      taskId: input.task_id,
      summary: input.summary,
      changes: input.changes,
      testsStatus: input.tests_status,
      blockedOn: input.blocked_on,
      nextStep: input.next_step,
      tokensSpent: input.tokens_spent,
    });
    return { session_log: session };
  },
});
