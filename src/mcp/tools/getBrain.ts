import { z } from 'zod';
import { defineTool } from '../lib/tool';
import { getBrain, inScope } from '../../lib/db/repository';
import { forbidden } from '../lib/errors';

export const getBrainTool = defineTool({
  name: 'get_brain',
  description: {
    summary: 'Fetch the structured Project Brain sections (current state, decisions, conventions, environment, client notes, open questions).',
    useWhen: 'you need the full project memory rather than a task-scoped briefing.',
    doNotUseWhen: 'you are starting a task — get_context_pack already includes the relevant brain sections, trimmed to budget.',
    sideEffects: 'none.',
    returns: '{ sections: [{ section, body, version }] }.',
    errors: 'FORBIDDEN_FOR_ROLE if the project is outside token scope.',
  },
  input: z.object({ project_id: z.string().uuid() }).strict(),
  allowedRoles: ['owner', 'project_lead', 'worker'],
  mutates: false,
  async handler({ ctx, input }) {
    if (!inScope(ctx, input.project_id)) throw forbidden('project out of token scope');
    const sections = await getBrain(input.project_id);
    return { sections };
  },
});
