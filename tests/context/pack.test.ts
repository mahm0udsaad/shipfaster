import { describe, it, expect } from 'vitest';
import { assembleContextPack, estimateTokens, type PackInput } from '../../src/lib/context/pack';

function baseInput(overrides: Partial<PackInput> = {}): PackInput {
  return {
    projectName: 'bookitfly',
    focusedTask: {
      id: 'task-1',
      title: 'Fix double-booking race',
      description: 'Two users can book the same slot.',
      acceptance_criteria: 'No two confirmed bookings share a slot.',
      comments: [{ actor: 'owner', body: 'Client hit this in prod.' }],
    },
    brain: [
      { section: 'current_state', body: 'Booking flow live; payments in test mode.' },
      { section: 'conventions', body: 'Server actions only; no client-side mutations.' },
      { section: 'environment', body: 'Vercel + Supabase eu-central-1; staging at stg.bookitfly.' },
      { section: 'decisions', body: 'Chose optimistic locking on slots (2026-05).' },
      { section: 'client_notes', body: 'Prefers WhatsApp; replies slowly on weekends.' },
      { section: 'open_questions', body: 'Refund policy for cancellations undecided.' },
    ],
    relatedTasks: [{ id: 'task-2', title: 'Add slot-lock index', status: 'todo', assignee_agent_id: null }],
    recentActivity: [{ verb: 'task.created', summary: 'Fix double-booking race', created_at: '2026-07-09' }],
    tokenBudget: 4000,
    ...overrides,
  };
}

describe('Context Pack assembler (§18.10)', () => {
  it('includes all sections when budget is ample', () => {
    const pack = assembleContextPack(baseInput());
    expect(pack.manifest.included).toContain('focused_task');
    expect(pack.manifest.included).toContain('brain.current_state');
    expect(pack.manifest.dropped).toEqual([]);
  });

  it('omits environment unless the task is infra-flavored', () => {
    const withoutHint = assembleContextPack(baseInput({ infraTaskHint: false }));
    expect(withoutHint.manifest.included).not.toContain('brain.environment');
    const withHint = assembleContextPack(baseInput({ infraTaskHint: true }));
    expect(withHint.manifest.included).toContain('brain.environment');
  });

  it('drops whole low-priority sections first, never the focused task', () => {
    const pack = assembleContextPack(baseInput({ tokenBudget: 140 }));
    // focused task is highest priority and must survive
    expect(pack.manifest.included).toContain('focused_task');
    // something must have been dropped, and drops are low-priority sections
    expect(pack.manifest.dropped.length).toBeGreaterThan(0);
    expect(pack.manifest.dropped).toContain('brain.open_questions');
  });

  it('never truncates mid-section: every included piece is whole', () => {
    const full = baseInput();
    const pack = assembleContextPack({ ...full, tokenBudget: 200 });
    for (const piece of pack.pieces) {
      const original = piece.text;
      expect(original.endsWith('…')).toBe(false); // no ellipsis truncation
      expect(piece.tokens).toBe(estimateTokens(original));
    }
  });

  it('respects the token budget (minus manifest headroom)', () => {
    const pack = assembleContextPack(baseInput({ tokenBudget: 300 }));
    expect(pack.manifest.tokenEstimate).toBeLessThanOrEqual(300);
  });

  it('manifest reports dropped sources so the agent sees what it lacks', () => {
    const pack = assembleContextPack(baseInput({ tokenBudget: 120 }));
    expect(Array.isArray(pack.manifest.dropped)).toBe(true);
    expect(pack.manifest.included.length + pack.manifest.dropped.length).toBeGreaterThan(0);
  });

  it('is deterministic: same input yields identical output', () => {
    const a = assembleContextPack(baseInput({ tokenBudget: 250 }));
    const b = assembleContextPack(baseInput({ tokenBudget: 250 }));
    expect(a).toEqual(b);
  });
});
