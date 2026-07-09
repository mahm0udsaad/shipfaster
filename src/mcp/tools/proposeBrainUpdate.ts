import { z } from 'zod';
import { defineTool } from '../lib/tool';
import { proposeBrainUpdate, inScope } from '../../lib/db/repository';
import { forbidden } from '../lib/errors';

const SECTIONS = [
  'current_state',
  'decisions',
  'conventions',
  'environment',
  'client_notes',
  'open_questions',
] as const;

export const proposeBrainUpdateTool = defineTool({
  name: 'propose_brain_update',
  description: {
    summary: 'Propose a diff to a Project Brain section (add/update/remove); it lands in the Approvals inbox.',
    useWhen: 'a session produced a durable fact — a decision, a new convention, a change in project state.',
    doNotUseWhen: 'the note only matters to one task — use add_comment. You cannot write the brain directly.',
    sideEffects: 'STAGED ONLY: inserts a proposed brain_diff and an open approval. NOTHING is merged until the human approves.',
    returns: '{ brain_diff_id, approval_id, status: "proposed" }.',
    errors: 'FORBIDDEN_FOR_ROLE (project out of token scope); VALIDATION (unknown section).',
  },
  input: z
    .object({
      project_id: z.string().uuid(),
      section: z.enum(SECTIONS),
      operation: z.enum(['add', 'update', 'remove']),
      before_text: z.string().optional(),
      after_text: z.string().optional(),
      evidence_session_log_id: z.string().uuid().optional(),
    })
    .strict(),
  allowedRoles: ['owner', 'project_lead', 'worker', 'brain_sync'],
  mutates: true,
  async handler({ ctx, input }) {
    if (!inScope(ctx, input.project_id)) throw forbidden('project out of token scope');
    return proposeBrainUpdate(ctx, {
      projectId: input.project_id,
      section: input.section,
      operation: input.operation,
      beforeText: input.before_text,
      afterText: input.after_text,
      evidenceSessionLogId: input.evidence_session_log_id,
    });
  },
});
