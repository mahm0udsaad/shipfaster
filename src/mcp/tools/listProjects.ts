import { z } from 'zod';
import { defineTool } from '../lib/tool';
import { listProjects } from '../../lib/db/repository';

export const listProjectsTool = defineTool({
  name: 'list_projects',
  description: {
    summary: 'Enumerate the projects this token can see, each with status and its client name.',
    useWhen: 'orienting at the start of a session, or when you need a project id to pass to other tools.',
    doNotUseWhen: 'you already know the project id and want its details — use get_project instead.',
    sideEffects: 'none.',
    returns: '{ projects: [{ id, name, slug, status, client }] } — ids feed get_project/get_context_pack.',
    errors: 'FORBIDDEN_FOR_ROLE if the token is revoked. Never NOT_FOUND (an empty list is valid).',
  },
  input: z.object({}).strict(),
  allowedRoles: ['owner', 'project_lead', 'worker', 'intake'],
  mutates: false,
  async handler({ ctx }) {
    const rows = await listProjects(ctx);
    return {
      projects: rows.map((p: any) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        status: p.status,
        client: p.clients?.name ?? null,
      })),
    };
  },
});
