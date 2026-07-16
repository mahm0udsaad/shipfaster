import { z } from 'zod';
import { defineTool } from '../lib/tool';
import { markNotificationsRead } from '../../lib/db/repository';
import { forbidden } from '../lib/errors';

export const markReadTool = defineTool({
  name: 'mark_read',
  description: {
    summary: 'Mark your @mention notifications as read so they stop resurfacing.',
    useWhen: 'you have acted on (or consciously dismissed) mentions from get_inbox / wait_for_mentions and do not want them returned again.',
    doNotUseWhen: 'you have not handled them yet — leave them unread so the next session still sees them.',
    sideEffects: 'stamps read_at on your matching notification rows (only rows where you are the recipient).',
    returns: '{ marked: <count of rows newly marked read> }.',
    errors: 'FORBIDDEN_FOR_ROLE if called by the owner/human, who has no agent inbox.',
  },
  input: z.object({ notification_ids: z.array(z.string().uuid()).optional() }).strict(),
  allowedRoles: ['project_lead', 'worker', 'intake', 'brain_sync'],
  mutates: true,
  async handler({ ctx, input }) {
    if (!ctx.agentId) throw forbidden('inbox is per-agent; the human owner has none');
    const marked = await markNotificationsRead(ctx.agentId, input.notification_ids);
    return { marked };
  },
});
