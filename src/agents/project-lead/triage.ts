import {
  addComment,
  getAgentByName,
  resolveSoleAccountId,
  getProjectTriageData,
  listProjectTriageData,
  logSession,
  proposeBrainUpdate,
  requestApproval,
  updateTask,
  type ActorContext,
} from '../../lib/db/repository';
import {
  detectStaleness,
  taskWasHumanTouchedRecently,
  type TriageBrainSection,
  type TriageFlag,
  type TriageInput,
  type TriageTask,
  type TriageThresholds,
} from './staleness';

export type TriageActionTaken = {
  taskId?: string;
  change: string;
  reason: string;
};

export type TriageDraft = {
  kind: 'client_message';
  title: string;
  message: string;
};

export type TriageReport = {
  project: { id: string; name: string; slug?: string };
  actions_taken: TriageActionTaken[];
  flags: TriageFlag[];
  drafts: TriageDraft[];
  brain_proposals: string[];
};

type TaskMutationPlan = {
  taskId: string;
  change: string;
  reason: string;
  patch?: Record<string, unknown>;
  comment?: string;
  requiresApproval: boolean;
};

type BrainProposalPlan = {
  section: 'current_state' | 'open_questions';
  operation: 'add' | 'update';
  beforeText?: string;
  afterText: string;
};

export type TriagePlan = {
  report: TriageReport;
  taskMutations: TaskMutationPlan[];
  taskApprovalRequests: TaskMutationPlan[];
  clientDrafts: TriageDraft[];
  brainProposals: BrainProposalPlan[];
};

export type RunTriageOptions = {
  projectId?: string;
  now?: Date;
  thresholds?: Partial<TriageThresholds>;
};

const DIRECT_MUTATION_FLAG_KINDS = new Set(['task_overdue', 'task_blocked', 'review_waiting_human']);

function byTaskId(tasks: TriageTask[]): Map<string, TriageTask> {
  return new Map(tasks.map((task) => [task.id, task]));
}

function taskForFlag(input: TriageInput, flag: TriageFlag): TriageTask | null {
  if (!flag.ref.taskId) return null;
  return byTaskId(input.tasks).get(flag.ref.taskId) ?? null;
}

function uniqueByTaskAndChange(actions: TaskMutationPlan[]): TaskMutationPlan[] {
  const seen = new Set<string>();
  return actions.filter((action) => {
    const key = `${action.taskId}:${action.change}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildClientDraft(input: TriageInput, flags: TriageFlag[]): TriageDraft | null {
  const clientName = input.project.clients?.name ?? 'there';
  const clientRelevant = flags.filter((flag) =>
    ['task_overdue', 'task_blocked', 'review_waiting_human', 'milestone_at_risk', 'project_inactive'].includes(flag.kind),
  );
  if (!clientRelevant.length) return null;

  const lines = clientRelevant.slice(0, 5).map((flag) => `- ${flag.detail}`);
  return {
    kind: 'client_message',
    title: `Draft client update: ${input.project.name}`,
    message: [
      `Hi ${clientName},`,
      '',
      `Quick status update on ${input.project.name}:`,
      ...lines,
      '',
      "I'll follow up with the next concrete update after these items are cleared.",
    ].join('\n'),
  };
}

function appendTriageNote(existing: string | undefined, date: string, flags: TriageFlag[]): string {
  const body = existing?.trim();
  const summary = flags
    .slice(0, 6)
    .map((flag) => `- ${flag.kind}: ${flag.detail}`)
    .join('\n');
  const note = [`Project Lead triage ${date}:`, summary].join('\n');
  return body ? `${body}\n\n${note}` : note;
}

function buildBrainProposal(input: TriageInput, flags: TriageFlag[], now: Date): BrainProposalPlan | null {
  if (!flags.some((flag) => flag.kind === 'brain_stale' || flag.kind === 'project_inactive')) return null;
  const existing = input.brain.find((section) => section.section === 'current_state') as TriageBrainSection | undefined;
  const date = now.toISOString().slice(0, 10);
  return {
    section: 'current_state',
    operation: existing ? 'update' : 'add',
    beforeText: existing?.body,
    afterText: appendTriageNote(existing?.body, date, flags),
  };
}

function planTaskMutations(input: TriageInput, flags: TriageFlag[], now: Date): TaskMutationPlan[] {
  const candidates: TaskMutationPlan[] = [];
  for (const flag of flags) {
    if (!DIRECT_MUTATION_FLAG_KINDS.has(flag.kind)) continue;
    const task = taskForFlag(input, flag);
    if (!task) continue;

    if (flag.kind === 'task_overdue' && !['high', 'urgent'].includes(task.priority)) {
      candidates.push({
        taskId: task.id,
        change: 'priority -> high',
        reason: 'Overdue task needs higher triage priority.',
        patch: { priority: 'high', updated_at: now.toISOString() },
        requiresApproval: taskWasHumanTouchedRecently(task, now),
      });
    }

    if (flag.kind === 'task_blocked') {
      candidates.push({
        taskId: task.id,
        change: 'comment: blocked follow-up',
        reason: 'Blocked task needs an explicit owner-facing follow-up.',
        comment: 'Project Lead triage: this task is still blocked and needs the blocker cleared or a decision from the human.',
        requiresApproval: taskWasHumanTouchedRecently(task, now),
      });
    }

    if (flag.kind === 'review_waiting_human') {
      candidates.push({
        taskId: task.id,
        change: 'comment: review follow-up',
        reason: 'Review task is waiting on the human.',
        comment: 'Project Lead triage: this is ready for human review and should be accepted, reopened, or clarified.',
        requiresApproval: taskWasHumanTouchedRecently(task, now),
      });
    }
  }
  return uniqueByTaskAndChange(candidates);
}

export function planProjectTriage(
  input: TriageInput,
  options: { now?: Date; thresholds?: Partial<TriageThresholds> } = {},
): TriagePlan {
  const now = options.now ?? new Date();
  const flags = detectStaleness(input, { now, thresholds: options.thresholds });
  const taskMutations = planTaskMutations(input, flags, now);
  const clientDraft = buildClientDraft(input, flags);
  const brainProposal = buildBrainProposal(input, flags, now);

  const directMutations = taskMutations.filter((action) => !action.requiresApproval);
  const approvalMutations = taskMutations.filter((action) => action.requiresApproval);

  return {
    report: {
      project: { id: input.project.id, name: input.project.name, slug: input.project.slug },
      actions_taken: directMutations.map(({ taskId, change, reason }) => ({ taskId, change, reason })),
      flags,
      drafts: clientDraft ? [clientDraft] : [],
      brain_proposals: [],
    },
    taskMutations: directMutations,
    taskApprovalRequests: approvalMutations,
    clientDrafts: clientDraft ? [clientDraft] : [],
    brainProposals: brainProposal ? [brainProposal] : [],
  };
}

export async function getProjectLeadActorContext(): Promise<ActorContext> {
  const agent = await getAgentByName(await resolveSoleAccountId(), 'project-lead');
  if (!agent) throw new Error("missing agents row named 'project-lead'");
  if (agent.revoked_at) throw new Error("agents row named 'project-lead' is revoked");
  if (agent.role !== 'project_lead') throw new Error("agents row named 'project-lead' must have role project_lead");
  return {
    agentId: agent.id,
    accountId: agent.account_id,
    actorType: 'agent',
    role: 'project_lead',
    projectScope: [],
  };
}

async function applyTaskMutation(ctx: ActorContext, mutation: TaskMutationPlan): Promise<TriageActionTaken> {
  if (mutation.patch) {
    await updateTask(ctx, mutation.taskId, mutation.patch, mutation.reason);
  }
  if (mutation.comment) {
    await addComment(ctx, mutation.taskId, mutation.comment, mutation.reason);
  }
  return { taskId: mutation.taskId, change: mutation.change, reason: mutation.reason };
}

async function requestTaskMutationApproval(ctx: ActorContext, projectId: string, mutation: TaskMutationPlan) {
  await requestApproval(ctx, {
    projectId,
    kind: 'task_plan',
    title: `Approve Project Lead task change: ${mutation.change}`,
    payload: {
      task_id: mutation.taskId,
      change: mutation.change,
      reason: mutation.reason,
      patch: mutation.patch ?? null,
      comment: mutation.comment ?? null,
      approval_reason: 'Task was touched by the human within the last 24 hours.',
    },
  });
}

async function runOneProject(ctx: ActorContext, input: TriageInput, options: RunTriageOptions): Promise<TriageReport> {
  const plan = planProjectTriage(input, options);
  const report: TriageReport = {
    ...plan.report,
    actions_taken: [...plan.report.actions_taken],
    brain_proposals: [],
  };
  let blockedOn: string | undefined;

  try {
    for (const mutation of plan.taskMutations) {
      await applyTaskMutation(ctx, mutation);
    }

    for (const mutation of plan.taskApprovalRequests) {
      await requestTaskMutationApproval(ctx, input.project.id, mutation);
    }

    for (const draft of plan.clientDrafts) {
      await requestApproval(ctx, {
        projectId: input.project.id,
        kind: 'client_message',
        title: draft.title,
        payload: { message: draft.message, draft_kind: draft.kind },
      });
    }

    for (const proposal of plan.brainProposals) {
      const proposed = await proposeBrainUpdate(ctx, {
        projectId: input.project.id,
        section: proposal.section,
        operation: proposal.operation,
        beforeText: proposal.beforeText,
        afterText: proposal.afterText,
      });
      report.brain_proposals.push(proposed.brain_diff_id);
    }
  } catch (error) {
    blockedOn = error instanceof Error ? error.message : 'unknown triage error';
    throw error;
  } finally {
    await logSession(ctx, {
      projectId: input.project.id,
      summary: `Project Lead triage: ${report.flags.length} flags, ${report.actions_taken.length} direct actions, ${report.drafts.length} client drafts, ${report.brain_proposals.length} brain proposals.`,
      changes: report.actions_taken.map((action) => ({ type: 'triage_action', ref: action.taskId, note: action.change })),
      testsStatus: 'not run: triage agent does not execute code',
      blockedOn,
      nextStep: report.flags.length ? 'Human should review approvals and flagged risks.' : 'No triage follow-up needed.',
    });
  }

  return report;
}

export async function runProjectLeadTriage(options: RunTriageOptions = {}): Promise<TriageReport[]> {
  const ctx = await getProjectLeadActorContext();
  const inputs = options.projectId
    ? [await getProjectTriageData(ctx, options.projectId)]
    : await listProjectTriageData(ctx);

  const reports: TriageReport[] = [];
  for (const input of inputs) {
    reports.push(await runOneProject(ctx, input as TriageInput, options));
  }
  return reports;
}
