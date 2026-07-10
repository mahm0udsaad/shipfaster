import { z } from 'zod';
import { defineTool } from '../lib/tool';
import { renameSelf } from '../../lib/db/repository';
import { forbidden } from '../lib/errors';

export const renameSelfTool = defineTool({
  name: 'rename_self',
  description: {
    summary: 'Change your own display name (e.g. a friendlier name the user chose for you).',
    useWhen: 'the user agreed on a name for you during introductions and you want it reflected everywhere.',
    doNotUseWhen: 'you have not confirmed the name with the user — always agree it first; do not rename other agents.',
    sideEffects: 'updates your agents row name and writes an audited activity entry.',
    returns: '{ name } — your new name.',
    errors: 'FORBIDDEN_FOR_ROLE if you are the owner (humans are not agent rows); VALIDATION if the name is empty.',
  },
  input: z.object({ name: z.string().min(1).max(40) }).strict(),
  allowedRoles: ['project_lead', 'worker', 'intake'],
  mutates: true,
  async handler({ ctx, input }) {
    if (!ctx.agentId) throw forbidden('only agents can rename themselves');
    return renameSelf(ctx, input.name);
  },
});
