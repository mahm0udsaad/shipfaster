import { z } from 'zod';
import { defineTool } from '../lib/tool';
import { requestApproval, inScope } from '../../lib/db/repository';
import { forbidden } from '../lib/errors';

export const requestApprovalTool = defineTool({
  name: 'request_approval',
  description: {
    summary: 'Put a proposed action in front of the human: a drafted client message, a plan change, or a scope question.',
    useWhen: 'you need human sign-off — a client-facing draft, expanding scope beyond acceptance criteria, or an irreversible action.',
    doNotUseWhen: 'the action is within your allowed autonomy — just do it. There is no tool to APPROVE; only the human resolves approvals.',
    sideEffects: 'STAGED ONLY: inserts an open approval. It applies nothing on its own — the human acts on it in the dashboard.',
    returns: '{ approval_id, status: "open" }.',
    errors: 'FORBIDDEN_FOR_ROLE if a supplied project_id is outside token scope.',
  },
  input: z
    .object({
      project_id: z.string().uuid().optional(),
      kind: z.enum(['client_message', 'task_plan', 'scope', 'other']),
      title: z.string().min(1),
      payload: z.record(z.any()).optional(),
    })
    .strict(),
  allowedRoles: ['owner', 'project_lead', 'worker'],
  mutates: true,
  async handler({ ctx, input }) {
    if (input.project_id && !inScope(ctx, input.project_id)) throw forbidden('project out of token scope');
    return requestApproval(ctx, {
      projectId: input.project_id,
      kind: input.kind,
      title: input.title,
      payload: input.payload,
    });
  },
});
