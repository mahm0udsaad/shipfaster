import { z } from 'zod';
import { defineTool } from '../lib/tool';
import { createMilestone, updateMilestone, getMilestone, inScope } from '../../lib/db/repository';
import { forbidden, notFound, validation } from '../lib/errors';

export const recordFinanceTool = defineTool({
  name: 'record_finance',
  description: {
    summary:
      'Record a financial figure for a project as a milestone — e.g. "5k remaining to collect from the customer".',
    useWhen:
      'you were told a money fact (an amount owed, invoiced, or paid) — say in your init prompt — and need it on the project ledger. Create a new milestone, or pass milestone_id to correct an existing one.',
    doNotUseWhen:
      'the figure is speculative or needs the owner to sign off first — use request_approval. This tool writes the money DIRECTLY.',
    sideEffects:
      'WRITES a milestones row (insert or update) and an audited activity entry. Feeds the project owed/paid summary immediately.',
    returns: '{ milestone: { id, title, amount, currency, status, ... }, created: boolean }.',
    errors:
      'FORBIDDEN_FOR_ROLE (project out of token scope); NOT_FOUND (milestone_id not in scope); VALIDATION (nothing to update).',
  },
  input: z
    .object({
      project_id: z.string().uuid(),
      milestone_id: z.string().uuid().optional(),
      title: z.string().min(1).optional(),
      amount: z.number().min(0).optional(),
      currency: z.string().min(1).optional(),
      status: z.enum(['pending', 'invoiced', 'paid']).optional(),
      due_at: z.string().datetime().optional(),
    })
    .strict(),
  allowedRoles: ['owner', 'project_lead', 'worker'],
  mutates: true,
  async handler({ ctx, input }) {
    if (!inScope(ctx, input.project_id)) throw forbidden('project out of token scope');

    if (input.milestone_id) {
      const existing = await getMilestone(ctx.projectScope, input.milestone_id);
      if (!existing || existing.project_id !== input.project_id) throw notFound('milestone not found');
      if (
        input.title === undefined &&
        input.amount === undefined &&
        input.currency === undefined &&
        input.status === undefined &&
        input.due_at === undefined
      ) {
        throw validation('nothing to update — provide at least one field');
      }
      const milestone = await updateMilestone(ctx, input.milestone_id, {
        title: input.title,
        amount: input.amount,
        currency: input.currency,
        status: input.status,
        dueAt: input.due_at,
      });
      return { milestone, created: false };
    }

    // Creating a new milestone: title + amount are required.
    if (!input.title) throw validation('title is required when creating a milestone');
    if (input.amount === undefined) throw validation('amount is required when creating a milestone');
    const milestone = await createMilestone(ctx, {
      projectId: input.project_id,
      title: input.title,
      amount: input.amount,
      currency: input.currency,
      status: input.status,
      dueAt: input.due_at,
    });
    return { milestone, created: true };
  },
});
