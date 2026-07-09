/**
 * Deterministic Context Pack assembler (docs/section-18-19 §18.10).
 *
 * No LLM call: fast, free, debuggable, trustable shape. Sections are added in fixed
 * priority order and the pack is trimmed from the BOTTOM when over budget — whole
 * sections are dropped, never truncated mid-section, so an agent can trust that any
 * section it sees is complete. The manifest reports what was included AND dropped, so
 * the agent can see what it was NOT told.
 */

export type BrainSection = { section: string; body: string };
export type TaskRef = { id: string; title: string; status: string; assignee_agent_id: string | null };
export type ActivityRef = { verb: string; summary: string; created_at: string };
export type FocusedTask = {
  id: string;
  title: string;
  description: string | null;
  acceptance_criteria: string | null;
  comments: { actor: string; body: string }[];
};

export type PackInput = {
  projectName: string;
  focusedTask?: FocusedTask;
  brain: BrainSection[];
  relatedTasks: TaskRef[];
  recentActivity: ActivityRef[];
  tokenBudget: number;
  /** keywords that, if present in the task, pull the environment brain section higher */
  infraTaskHint?: boolean;
};

export type PackPiece = { key: string; title: string; text: string; tokens: number };
export type ContextPack = {
  manifest: {
    project: string;
    tokenBudget: number;
    tokenEstimate: number;
    included: string[];
    dropped: string[];
  };
  pieces: PackPiece[];
};

/** ~4 chars per token is the standard rough estimate. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function brainBody(brain: BrainSection[], key: string): string | null {
  const s = brain.find((b) => b.section === key);
  return s && s.body.trim() ? s.body.trim() : null;
}

/**
 * Build the ordered list of candidate pieces at fixed priority (§18.10):
 *  1 manifest (added last, always kept)
 *  2 focused task (title/desc/criteria/thread)
 *  3 current_state + conventions (+ environment if infra task)
 *  4 decisions
 *  5 related open tasks
 *  6 recent activity
 *  7 client_notes + open_questions
 */
function candidates(input: PackInput): PackPiece[] {
  const pieces: PackPiece[] = [];
  const push = (key: string, title: string, text: string | null) => {
    if (text && text.trim()) pieces.push({ key, title, text: text.trim(), tokens: estimateTokens(text) });
  };

  if (input.focusedTask) {
    const t = input.focusedTask;
    const thread = t.comments.map((c) => `- ${c.actor}: ${c.body}`).join('\n');
    push(
      'focused_task',
      'Focused task',
      [
        `# ${t.title}`,
        t.description ? `\n${t.description}` : '',
        t.acceptance_criteria ? `\n\nAcceptance criteria:\n${t.acceptance_criteria}` : '',
        thread ? `\n\nThread:\n${thread}` : '',
      ].join(''),
    );
  }

  push('brain.current_state', 'Brain — current state', brainBody(input.brain, 'current_state'));
  push('brain.conventions', 'Brain — conventions', brainBody(input.brain, 'conventions'));
  if (input.infraTaskHint) {
    push('brain.environment', 'Brain — environment', brainBody(input.brain, 'environment'));
  }
  push('brain.decisions', 'Brain — decisions', brainBody(input.brain, 'decisions'));

  if (input.relatedTasks.length) {
    push(
      'related_tasks',
      'Related open tasks',
      input.relatedTasks.map((t) => `- [${t.status}] ${t.title} (${t.id})`).join('\n'),
    );
  }
  if (input.recentActivity.length) {
    push(
      'recent_activity',
      'Recent activity',
      input.recentActivity.map((a) => `- ${a.created_at} ${a.verb}: ${a.summary}`).join('\n'),
    );
  }

  push('brain.client_notes', 'Brain — client notes', brainBody(input.brain, 'client_notes'));
  push('brain.open_questions', 'Brain — open questions', brainBody(input.brain, 'open_questions'));

  return pieces;
}

export function assembleContextPack(input: PackInput): ContextPack {
  const ordered = candidates(input);

  const included: PackPiece[] = [];
  const dropped: string[] = [];
  let used = 0;
  // reserve a little headroom for the manifest text itself
  const budget = Math.max(0, input.tokenBudget - 80);

  for (const piece of ordered) {
    if (used + piece.tokens <= budget) {
      included.push(piece);
      used += piece.tokens;
    } else {
      dropped.push(piece.key);
    }
  }

  return {
    manifest: {
      project: input.projectName,
      tokenBudget: input.tokenBudget,
      tokenEstimate: used,
      included: included.map((p) => p.key),
      dropped,
    },
    pieces: included,
  };
}

/** Render a pack to the single text blob an agent receives. */
export function renderPack(pack: ContextPack): string {
  const header =
    `## Context pack — ${pack.manifest.project}\n` +
    `Included: ${pack.manifest.included.join(', ') || '(none)'}\n` +
    `Dropped (over budget): ${pack.manifest.dropped.join(', ') || '(none)'}\n` +
    `~${pack.manifest.tokenEstimate}/${pack.manifest.tokenBudget} tokens\n`;
  const body = pack.pieces.map((p) => `\n### ${p.title}\n${p.text}`).join('\n');
  return header + body;
}
