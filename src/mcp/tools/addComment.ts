import { z } from 'zod';
import { defineTool } from '../lib/tool';
import {
  addComment,
  getTask,
  inScope,
  resolveAgentsByName,
  createMentionNotifications,
} from '../../lib/db/repository';
import { parseMentions } from '../../lib/mentions';
import { forbidden, notFound } from '../lib/errors';

export const addCommentTool = defineTool({
  name: 'add_comment',
  description: {
    summary: 'Add a comment to a task thread; @mentions notify the named agents.',
    useWhen: 'recording context a future session needs that is not brain-worthy, explaining a status change, or pinging another agent with @name to hand off / ask for review.',
    doNotUseWhen: 'the note belongs in project memory — propose_brain_update instead. Workers may comment only on their own task.',
    sideEffects: 'inserts a comments row and an audited activity entry; for each resolved @mention, inserts a notification (the agent picks it up via get_inbox / wait_for_mentions).',
    returns: '{ comment: { id, created_at }, mentioned: [names notified], unresolved: [@names that matched no agent] }.',
    errors: 'NOT_FOUND (bad task id); FORBIDDEN_FOR_ROLE (worker commenting on another task, or out-of-scope project).',
  },
  input: z.object({ task_id: z.string().uuid(), body: z.string().min(1) }).strict(),
  allowedRoles: ['owner', 'project_lead', 'worker'],
  mutates: true,
  async handler({ ctx, input }) {
    const task = await getTask(ctx, input.task_id);
    if (!task) throw notFound('task not found');
    if (!inScope(ctx, task.project_id)) throw forbidden('task out of token scope');
    if (ctx.role === 'worker' && task.assignee_agent_id !== ctx.agentId) {
      throw forbidden('workers may only comment on their own task');
    }
    const comment = await addComment(ctx, input.task_id, input.body);

    // Fan out @mentions to durable per-agent notifications.
    const names = parseMentions(input.body);
    const resolved = await resolveAgentsByName(ctx.accountId, names);
    const resolvedNames = new Set(resolved.map((r) => r.name.toLowerCase()));
    const unresolved = names.filter((n) => !resolvedNames.has(n));
    const notified = await createMentionNotifications(ctx, {
      projectId: task.project_id,
      taskId: input.task_id,
      commentId: comment.id,
      body: input.body,
      recipients: resolved,
    });

    return { comment, mentioned: notified.map((r) => r.name), unresolved };
  },
});
