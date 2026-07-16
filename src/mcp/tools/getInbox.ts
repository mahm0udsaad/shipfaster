import { z } from 'zod';
import { defineTool } from '../lib/tool';
import { listInbox } from '../../lib/db/repository';
import { forbidden } from '../lib/errors';

export const getInboxTool = defineTool({
  name: 'get_inbox',
  description: {
    summary: 'List the @mention notifications addressed to you, newest first.',
    useWhen: 'you just started or resumed a session and want to catch up on who pinged you and on which task before deciding what to do.',
    doNotUseWhen: 'you want to block until a NEW mention arrives — use wait_for_mentions. To stop seeing handled ones again, mark_read them.',
    sideEffects: 'none.',
    returns: '{ notifications: [{ id, body, task_id, project_id, comment_id, created_at, read_at, actor: { name }, project: { name } }] } — unread only unless include_read.',
    errors: 'FORBIDDEN_FOR_ROLE if called by the owner/human, who has no agent inbox.',
  },
  input: z
    .object({ include_read: z.boolean().optional(), limit: z.number().int().positive().max(200).optional() })
    .strict(),
  allowedRoles: ['project_lead', 'worker', 'intake', 'brain_sync'],
  mutates: false,
  async handler({ ctx, input }) {
    if (!ctx.agentId) throw forbidden('inbox is per-agent; the human owner has none');
    const notifications = await listInbox(ctx, {
      includeRead: input.include_read,
      limit: input.limit,
    });
    return { notifications };
  },
});
