import { z } from 'zod';
import { defineTool } from '../lib/tool';
import { getContextPackData, inScope } from '../../lib/db/repository';
import { assembleContextPack } from '../../lib/context/pack';
import { forbidden } from '../lib/errors';

const INFRA = /(deploy|migration|env|infra|hosting|dns|secret|prod|staging|supabase|vercel)/i;

export const getContextPackTool = defineTool({
  name: 'get_context_pack',
  description: {
    summary: 'Assemble a token-budgeted briefing for a project or task: brain, task thread, related tasks, recent activity.',
    useWhen: 'starting any work session — this is cheaper and more complete than calling get_brain + list_tasks + get_project separately.',
    doNotUseWhen: 'you only need to re-check one field mid-session — use get_project or list_tasks instead.',
    sideEffects: 'none (a pack-generation event may be logged for freshness metrics).',
    returns: '{ manifest: { included, dropped, tokenEstimate }, pieces: [...] } — dropped tells you what you were NOT given.',
    errors: 'NOT_FOUND (bad project id — re-run list_projects); FORBIDDEN_FOR_ROLE (token not scoped to this project).',
  },
  input: z
    .object({
      project_id: z.string().uuid(),
      task_id: z.string().uuid().optional(),
      token_budget: z.number().int().min(500).max(20000).default(4000),
    })
    .strict(),
  allowedRoles: ['owner', 'project_lead', 'worker'],
  mutates: false,
  async handler({ ctx, input }) {
    if (!inScope(ctx, input.project_id)) throw forbidden('project out of token scope');
    const data = await getContextPackData(ctx, input.project_id, input.task_id);
    const infraHint = input.task_id
      ? INFRA.test(`${data.focusedTask?.title ?? ''} ${data.focusedTask?.description ?? ''}`)
      : false;
    return assembleContextPack({
      projectName: data.projectName,
      focusedTask: data.focusedTask,
      brain: data.brain,
      relatedTasks: data.relatedTasks,
      recentActivity: data.recentActivity,
      tokenBudget: input.token_budget ?? 4000,
      infraTaskHint: infraHint,
    });
  },
});
