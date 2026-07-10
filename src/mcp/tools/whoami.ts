import { z } from 'zod';
import { defineTool } from '../lib/tool';
import { getSelf } from '../../lib/db/repository';

export const whoamiTool = defineTool({
  name: 'whoami',
  description: {
    summary: 'Return your own identity — your agent name, role, and the projects you are scoped to.',
    useWhen: 'at the very start of a session, to introduce yourself to the user by name and say which project you are on.',
    doNotUseWhen: 'you need project or task data — use get_project / list_tasks / get_context_pack instead.',
    sideEffects: 'none.',
    returns: '{ agentId, name, role, projects: [names] }.',
    errors: 'FORBIDDEN_FOR_ROLE if the token is revoked. Never NOT_FOUND.',
  },
  input: z.object({}).strict(),
  allowedRoles: ['owner', 'project_lead', 'worker', 'intake'],
  mutates: false,
  async handler({ ctx }) {
    return getSelf(ctx);
  },
});
