import { z } from 'zod';
import { defineTool } from '../lib/tool';
import { getProject, inScope } from '../../lib/db/repository';
import { notFound, forbidden } from '../lib/errors';

export const getProjectTool = defineTool({
  name: 'get_project',
  description: {
    summary: 'Fetch one project with its client, milestones, and a money summary (owed vs paid).',
    useWhen: 'you have a project id and need its details, milestones, or payment state.',
    doNotUseWhen: 'starting work on a task — use get_context_pack, which bundles this plus the brain and tasks.',
    sideEffects: 'none.',
    returns: '{ project: {...}, money: { owed, paid, currency } }.',
    errors: 'NOT_FOUND (bad id — re-run list_projects); FORBIDDEN_FOR_ROLE (token not scoped to this project).',
  },
  input: z.object({ project_id: z.string().uuid() }).strict(),
  allowedRoles: ['owner', 'project_lead', 'worker'],
  mutates: false,
  async handler({ ctx, input }) {
    if (!inScope(ctx, input.project_id)) throw forbidden('project out of token scope');
    const project = await getProject(ctx, input.project_id);
    if (!project) throw notFound('project not found');

    const milestones = (project as any).milestones ?? [];
    const owed = milestones
      .filter((m: any) => m.status !== 'paid')
      .reduce((s: number, m: any) => s + Number(m.amount), 0);
    const paid = milestones
      .filter((m: any) => m.status === 'paid')
      .reduce((s: number, m: any) => s + Number(m.amount), 0);

    return {
      project,
      money: { owed, paid, currency: milestones[0]?.currency ?? 'USD' },
    };
  },
});
