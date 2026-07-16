import { z } from 'zod';
import { defineTool } from '../lib/tool';
import { createProject, getProjectBySlugRaw, slugify } from '../../lib/db/repository';
import { validation } from '../lib/errors';

export const createProjectTool = defineTool({
  name: 'create_project',
  description: {
    summary: 'Create a new client project (optionally creating/linking its client) — e.g. "Mazaya design".',
    useWhen:
      'you were handed a new engagement that is not in the tool yet and need a project id to attach tasks or finances to.',
    doNotUseWhen:
      'the project already exists — use list_projects to find its id. This is not for adding tasks (create_task) or money (record_finance).',
    sideEffects:
      'WRITES a projects row (and a clients row if client_name is new), plus an audited activity entry.',
    returns: '{ project: { id, name, slug, client_id, clients, ... }, created: true }.',
    errors: 'FORBIDDEN_FOR_ROLE (role may not create projects); VALIDATION (slug already taken).',
  },
  input: z
    .object({
      name: z.string().min(1),
      slug: z.string().min(1).optional(),
      client_name: z.string().min(1).optional(),
      pricing_model: z.enum(['fixed', 'retainer', 'mixed', 'internal']).optional(),
      status: z.enum(['active', 'paused', 'archived']).optional(),
    })
    .strict(),
  // Creating a project is a lead/owner action, mirroring "workers may not create top-level tasks".
  allowedRoles: ['owner', 'project_lead'],
  mutates: true,
  async handler({ ctx, input }) {
    const slug = input.slug ? slugify(input.slug) : slugify(input.name);
    if (!slug) throw validation('could not derive a slug from name — pass an explicit slug');
    const clash = await getProjectBySlugRaw(slug);
    if (clash) throw validation(`slug "${slug}" is already taken — pass a different slug`);

    const project = await createProject(ctx, {
      name: input.name,
      slug,
      clientName: input.client_name,
      pricingModel: input.pricing_model,
      status: input.status,
    });
    return { project, created: true };
  },
});
