import { z } from 'zod';
import { defineTool } from '../lib/tool';
import { search, inScope } from '../../lib/db/repository';
import { forbidden } from '../lib/errors';

export const searchTool = defineTool({
  name: 'search',
  description: {
    summary: 'One search across tasks, brain sections, and activity for a keyword or phrase.',
    useWhen: 'you are looking for something and do not know which task, decision, or event holds it.',
    doNotUseWhen: 'you already have the id — fetch it directly with get_project/list_tasks/get_brain.',
    sideEffects: 'none.',
    returns: '{ tasks:[...], brain:[...], activity:[...] } — brain uses full-text ranking.',
    errors: 'FORBIDDEN_FOR_ROLE if project_id is outside token scope.',
  },
  input: z
    .object({
      query: z.string().min(1),
      project_id: z.string().uuid().optional(),
    })
    .strict(),
  allowedRoles: ['owner', 'project_lead', 'worker'],
  mutates: false,
  async handler({ ctx, input }) {
    if (input.project_id && !inScope(ctx, input.project_id)) throw forbidden('project out of token scope');
    return search(ctx, input.query, input.project_id);
  },
});
