import { describe, expect, it } from 'vitest';
import {
  detectStaleness,
  planProjectTriage,
  sessionsSinceBrainUpdate,
  taskWasHumanTouchedRecently,
  type TriageInput,
} from '../../src/agents/project-lead/index';

const NOW = new Date('2026-07-10T12:00:00.000Z');

function input(overrides: Partial<TriageInput> = {}): TriageInput {
  return {
    project: {
      id: 'project-1',
      name: 'bookitfly',
      slug: 'bookitfly',
      status: 'active',
      updated_at: '2026-07-01T00:00:00.000Z',
      clients: { name: 'Bookitfly' },
    },
    tasks: [
      {
        id: 'task-overdue',
        project_id: 'project-1',
        title: 'Fix booking race',
        status: 'todo',
        priority: 'medium',
        assignee_agent_id: null,
        assignee_is_human: false,
        due_at: '2026-07-09T00:00:00.000Z',
        updated_at: '2026-07-01T00:00:00.000Z',
        created_at: '2026-07-01T00:00:00.000Z',
        human_touched_at: null,
        acceptance_criteria: 'No double booking.',
      },
      {
        id: 'task-blocked',
        project_id: 'project-1',
        title: 'Get Stripe webhook secret',
        status: 'blocked',
        priority: 'high',
        assignee_agent_id: 'agent-1',
        assignee_is_human: false,
        due_at: null,
        updated_at: '2026-07-08T00:00:00.000Z',
        created_at: '2026-07-03T00:00:00.000Z',
        human_touched_at: null,
        acceptance_criteria: null,
      },
      {
        id: 'task-review',
        project_id: 'project-1',
        title: 'Review checkout copy',
        status: 'review',
        priority: 'medium',
        assignee_agent_id: null,
        assignee_is_human: true,
        due_at: null,
        updated_at: '2026-07-09T00:00:00.000Z',
        created_at: '2026-07-04T00:00:00.000Z',
        human_touched_at: null,
        acceptance_criteria: null,
      },
    ],
    activity: [],
    sessions: [
      {
        id: 'session-1',
        project_id: 'project-1',
        summary: 'Built checkout',
        created_at: '2026-07-01T00:00:00.000Z',
      },
      {
        id: 'session-2',
        project_id: 'project-1',
        summary: 'Fixed webhook',
        created_at: '2026-07-01T02:00:00.000Z',
      },
      {
        id: 'session-3',
        project_id: 'project-1',
        summary: 'Updated UI',
        created_at: '2026-07-01T04:00:00.000Z',
      },
      {
        id: 'session-4',
        project_id: 'project-1',
        summary: 'Added tests',
        created_at: '2026-07-01T06:00:00.000Z',
      },
      {
        id: 'session-5',
        project_id: 'project-1',
        summary: 'Refined task',
        created_at: '2026-07-01T08:00:00.000Z',
      },
    ],
    brain: [
      {
        id: 'brain-1',
        project_id: 'project-1',
        section: 'current_state',
        body: 'Checkout is in progress.',
        version: 1,
        updated_at: '2026-07-01T00:00:00.000Z',
      },
    ],
    milestones: [
      {
        id: 'milestone-1',
        project_id: 'project-1',
        title: 'Checkout launch',
        status: 'pending',
        due_at: '2026-07-12T00:00:00.000Z',
        amount: 1000,
        currency: 'USD',
      },
    ],
    ...overrides,
  };
}

describe('Project Lead staleness detection', () => {
  it('flags untouched, inactive, stale-brain, overdue, blocked, review, and milestone risks', () => {
    const flags = detectStaleness(input(), { now: NOW });
    expect(flags.map((flag) => flag.kind)).toEqual([
      'task_untouched',
      'task_overdue',
      'task_blocked',
      'review_waiting_human',
      'project_inactive',
      'brain_stale',
      'milestone_at_risk',
    ]);
  });

  it('counts sessions since the latest brain update deterministically', () => {
    expect(sessionsSinceBrainUpdate(input())).toBe(5);
    expect(
      sessionsSinceBrainUpdate(
        input({
          brain: [
            {
              id: 'brain-1',
              project_id: 'project-1',
              section: 'current_state',
              body: 'Fresh',
              version: 2,
              updated_at: '2026-07-01T03:00:00.000Z',
            },
          ],
        }),
      ),
    ).toBe(3);
  });

  it('detects human touches inside the 24h approval window', () => {
    const recent = input().tasks[0]!;
    expect(taskWasHumanTouchedRecently({ ...recent, human_touched_at: '2026-07-10T00:30:00.000Z' }, NOW)).toBe(true);
    expect(taskWasHumanTouchedRecently({ ...recent, human_touched_at: '2026-07-08T00:30:00.000Z' }, NOW)).toBe(false);
  });
});

describe('Project Lead pure triage planner', () => {
  it('plans direct priority/comment actions plus staged drafts and brain proposals', () => {
    const plan = planProjectTriage(input(), { now: NOW });
    expect(plan.taskMutations.map((action) => action.change)).toEqual([
      'priority -> high',
      'comment: blocked follow-up',
      'comment: review follow-up',
    ]);
    expect(plan.taskApprovalRequests).toEqual([]);
    expect(plan.report.actions_taken).toHaveLength(3);
    expect(plan.clientDrafts[0]?.kind).toBe('client_message');
    expect(plan.brainProposals[0]?.section).toBe('current_state');
  });

  it('routes recently human-touched task changes to approval instead of direct mutation', () => {
    const base = input();
    const plan = planProjectTriage(
      input({
        tasks: base.tasks.map((task) =>
          task.id === 'task-overdue' ? { ...task, human_touched_at: '2026-07-10T01:00:00.000Z' } : task,
        ),
      }),
      { now: NOW },
    );
    expect(plan.taskMutations.map((action) => action.taskId)).not.toContain('task-overdue');
    expect(plan.taskApprovalRequests.map((action) => action.taskId)).toContain('task-overdue');
  });

  it('is deterministic for the same input and clock', () => {
    const first = planProjectTriage(input(), { now: NOW });
    const second = planProjectTriage(input(), { now: NOW });
    expect(first).toEqual(second);
  });
});
