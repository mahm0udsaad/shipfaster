export type TriageProject = {
  id: string;
  name: string;
  slug?: string;
  status: string;
  updated_at?: string | null;
  clients?: { name?: string | null } | null;
};

export type TriageTask = {
  id: string;
  project_id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'blocked' | 'review' | 'done' | 'cancelled' | string;
  priority: 'low' | 'medium' | 'high' | 'urgent' | string;
  assignee_agent_id: string | null;
  assignee_is_human: boolean;
  due_at: string | null;
  updated_at: string;
  created_at?: string;
  human_touched_at: string | null;
  acceptance_criteria?: string | null;
};

export type TriageActivity = {
  id?: string;
  project_id: string | null;
  task_id?: string | null;
  verb: string;
  summary: string;
  actor_type?: string;
  created_at: string;
};

export type TriageSessionLog = {
  id: string;
  project_id: string;
  task_id?: string | null;
  summary: string;
  blocked_on?: string | null;
  next_step?: string | null;
  created_at: string;
};

export type TriageBrainSection = {
  id?: string;
  project_id: string;
  section: string;
  body: string;
  version: number;
  updated_at: string;
};

export type TriageMilestone = {
  id: string;
  project_id: string;
  title: string;
  status: string;
  due_at: string | null;
  amount?: number | string;
  currency?: string;
};

export type TriageInput = {
  project: TriageProject;
  tasks: TriageTask[];
  activity: TriageActivity[];
  sessions: TriageSessionLog[];
  brain: TriageBrainSection[];
  milestones: TriageMilestone[];
};

export type TriageThresholds = {
  taskUntouchedDays: number;
  projectInactiveDays: number;
  brainStaleSessions: number;
  milestoneRiskDays: number;
};

export const DEFAULT_TRIAGE_THRESHOLDS: TriageThresholds = {
  taskUntouchedDays: 7,
  projectInactiveDays: 7,
  brainStaleSessions: 5,
  milestoneRiskDays: 3,
};

export type TriageFlag = {
  kind:
    | 'task_untouched'
    | 'project_inactive'
    | 'brain_stale'
    | 'task_overdue'
    | 'task_blocked'
    | 'review_waiting_human'
    | 'milestone_at_risk';
  ref: { projectId: string; taskId?: string; milestoneId?: string; section?: string };
  detail: string;
};

const CLOSED_TASK_STATUSES = new Set(['done', 'cancelled']);

function daysBetween(later: Date, earlierIso: string): number {
  return (later.getTime() - new Date(earlierIso).getTime()) / (24 * 60 * 60 * 1000);
}

function isOpenTask(task: TriageTask): boolean {
  return !CLOSED_TASK_STATUSES.has(task.status);
}

function latestIso(values: (string | null | undefined)[]): string | null {
  const timestamps = values
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));
  if (!timestamps.length) return null;
  return new Date(Math.max(...timestamps)).toISOString();
}

export function sessionsSinceBrainUpdate(input: TriageInput): number {
  const latestBrainUpdate = latestIso(input.brain.map((section) => section.updated_at));
  if (!latestBrainUpdate) return input.sessions.length;
  const brainUpdatedAt = new Date(latestBrainUpdate).getTime();
  return input.sessions.filter((session) => new Date(session.created_at).getTime() >= brainUpdatedAt).length;
}

export function detectStaleness(
  input: TriageInput,
  options: { now?: Date; thresholds?: Partial<TriageThresholds> } = {},
): TriageFlag[] {
  const now = options.now ?? new Date();
  const thresholds = { ...DEFAULT_TRIAGE_THRESHOLDS, ...options.thresholds };
  const flags: TriageFlag[] = [];

  for (const task of input.tasks.filter(isOpenTask)) {
    const untouchedDays = daysBetween(now, task.updated_at);
    if (untouchedDays > thresholds.taskUntouchedDays) {
      flags.push({
        kind: 'task_untouched',
        ref: { projectId: task.project_id, taskId: task.id },
        detail: `${task.title} has not been updated for ${Math.floor(untouchedDays)} days.`,
      });
    }

    if (task.due_at && new Date(task.due_at).getTime() < now.getTime()) {
      flags.push({
        kind: 'task_overdue',
        ref: { projectId: task.project_id, taskId: task.id },
        detail: `${task.title} was due ${task.due_at}.`,
      });
    }

    if (task.status === 'blocked') {
      flags.push({
        kind: 'task_blocked',
        ref: { projectId: task.project_id, taskId: task.id },
        detail: `${task.title} is blocked.`,
      });
    }

    if (task.status === 'review' && (task.assignee_is_human || !task.assignee_agent_id)) {
      flags.push({
        kind: 'review_waiting_human',
        ref: { projectId: task.project_id, taskId: task.id },
        detail: `${task.title} is waiting for human review.`,
      });
    }
  }

  const lastProjectSignal = latestIso([
    ...input.activity.map((entry) => entry.created_at),
    ...input.sessions.map((session) => session.created_at),
    input.project.updated_at,
  ]);
  if (lastProjectSignal) {
    const inactiveDays = daysBetween(now, lastProjectSignal);
    if (inactiveDays > thresholds.projectInactiveDays) {
      flags.push({
        kind: 'project_inactive',
        ref: { projectId: input.project.id },
        detail: `${input.project.name} has had no activity for ${Math.floor(inactiveDays)} days.`,
      });
    }
  }

  const sessionsSinceUpdate = sessionsSinceBrainUpdate(input);
  if (sessionsSinceUpdate >= thresholds.brainStaleSessions) {
    flags.push({
      kind: 'brain_stale',
      ref: { projectId: input.project.id },
      detail: `Brain has not been updated across ${sessionsSinceUpdate} sessions.`,
    });
  }

  const riskWindowMs = thresholds.milestoneRiskDays * 24 * 60 * 60 * 1000;
  for (const milestone of input.milestones) {
    if (milestone.status === 'paid' || !milestone.due_at) continue;
    const dueAt = new Date(milestone.due_at).getTime();
    if (dueAt <= now.getTime() + riskWindowMs) {
      flags.push({
        kind: 'milestone_at_risk',
        ref: { projectId: milestone.project_id, milestoneId: milestone.id },
        detail: `${milestone.title} is ${dueAt < now.getTime() ? 'overdue' : 'due soon'} without paid status.`,
      });
    }
  }

  return flags;
}

export function taskWasHumanTouchedRecently(task: TriageTask, now: Date, hours = 24): boolean {
  if (!task.human_touched_at) return false;
  const ageMs = now.getTime() - new Date(task.human_touched_at).getTime();
  return ageMs >= 0 && ageMs < hours * 60 * 60 * 1000;
}
