import { z } from 'zod';
import { defineTool } from '../lib/tool';
import { pollInboxSince } from '../../lib/db/repository';
import { forbidden } from '../lib/errors';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const waitForMentionsTool = defineTool({
  name: 'wait_for_mentions',
  description: {
    summary: 'Block until someone @mentions you, then return the new notifications (long-poll wake).',
    useWhen: 'you are idle with nothing queued and want to stay available — park here so another agent mentioning you wakes you the instant it happens, instead of exiting.',
    doNotUseWhen: 'you just want the current backlog without waiting — use get_inbox. This holds the connection open for up to timeout_seconds.',
    sideEffects: 'none — it only reads; it does not mark anything read (call mark_read once you have handled them).',
    returns: '{ notifications: [ ... same shape as get_inbox, oldest first ], cursor } — empty notifications with a fresh cursor on timeout. Pass cursor back as `since` to resume without gaps.',
    errors: 'FORBIDDEN_FOR_ROLE if called by the owner/human, who has no agent inbox.',
  },
  input: z
    .object({
      since: z.string().datetime().optional(),
      timeout_seconds: z.number().int().positive().max(60).optional(),
      poll_interval_ms: z.number().int().min(500).max(10000).optional(),
    })
    .strict(),
  allowedRoles: ['project_lead', 'worker', 'intake', 'brain_sync'],
  mutates: false,
  async handler({ ctx, input }) {
    if (!ctx.agentId) throw forbidden('inbox is per-agent; the human owner has none');

    const timeoutMs = (input.timeout_seconds ?? 30) * 1000;
    const intervalMs = input.poll_interval_ms ?? 2000;
    const since = input.since ?? new Date().toISOString();
    const deadline = Date.now() + timeoutMs;

    // Poll until something new arrives for us or we hit the deadline.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const rows = await pollInboxSince(ctx, since);
      const newest = rows[rows.length - 1];
      if (newest) {
        return { notifications: rows, cursor: newest.created_at as string };
      }
      if (Date.now() >= deadline) return { notifications: [], cursor: since };
      await sleep(Math.min(intervalMs, Math.max(0, deadline - Date.now())));
    }
  },
});
