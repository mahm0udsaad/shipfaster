import { serviceClient } from './client';

/**
 * The data-access layer. EVERY database read/write in ship-faster goes through here.
 * Rationale (docs/development-plan.md guardrails): one place to swap infra, enforce
 * scoping, and write audit rows. MCP tools and dashboard server actions call these —
 * they never touch the Supabase client directly.
 */

export type ActorContext = {
  agentId: string | null;      // null = owner/system
  actorType: 'human' | 'agent';
  role: 'owner' | 'project_lead' | 'worker' | 'intake' | 'brain_sync';
  projectScope: string[];      // empty = all projects
};

function db() {
  return serviceClient();
}

/** True if the actor may see/act on a given project. */
export function inScope(ctx: ActorContext, projectId: string): boolean {
  return ctx.projectScope.length === 0 || ctx.projectScope.includes(projectId);
}

// ---------- projects ----------
export async function listProjects(ctx: ActorContext) {
  let q = db().from('projects').select('*, clients(name)').order('created_at', { ascending: false });
  if (ctx.projectScope.length > 0) q = q.in('id', ctx.projectScope);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getProject(ctx: ActorContext, projectId: string) {
  const { data, error } = await db()
    .from('projects')
    .select('*, clients(*), milestones(*)')
    .eq('id', projectId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ---------- tasks ----------
export type TaskFilter = {
  projectId?: string;
  status?: string;
  assigneeAgentId?: string;
  dueBefore?: string;
};

export async function listTasks(ctx: ActorContext, filter: TaskFilter = {}) {
  let q = db().from('tasks').select('*').order('updated_at', { ascending: false });
  if (filter.projectId) q = q.eq('project_id', filter.projectId);
  if (filter.status) q = q.eq('status', filter.status);
  if (filter.assigneeAgentId) q = q.eq('assignee_agent_id', filter.assigneeAgentId);
  if (filter.dueBefore) q = q.lte('due_at', filter.dueBefore);
  if (ctx.projectScope.length > 0) q = q.in('project_id', ctx.projectScope);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getTask(projectScope: string[], taskId: string) {
  const { data, error } = await db().from('tasks').select('*').eq('id', taskId).maybeSingle();
  if (error) throw error;
  return data;
}

// ---------- activity (append-only) ----------
export async function recordActivity(input: {
  projectId?: string | null;
  taskId?: string | null;
  ctx: ActorContext;
  verb: string;
  summary: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await db().from('activity').insert({
    project_id: input.projectId ?? null,
    task_id: input.taskId ?? null,
    actor_type: input.ctx.actorType,
    actor_agent_id: input.ctx.agentId,
    verb: input.verb,
    summary: input.summary,
    reason: input.reason ?? null,
    metadata: input.metadata ?? {},
  });
  if (error) throw error;
}

// ---------- brain ----------
export async function getBrain(projectId: string) {
  const { data, error } = await db()
    .from('brain_sections')
    .select('*')
    .eq('project_id', projectId)
    .order('section');
  if (error) throw error;
  return data ?? [];
}

// ---------- search (tasks + brain + activity) ----------
export async function search(ctx: ActorContext, query: string, projectId?: string) {
  const scope = projectId ? [projectId] : ctx.projectScope;
  const scopeFilter = (q: any) => (scope.length > 0 ? q.in('project_id', scope) : q);

  const tasks = await scopeFilter(
    db().from('tasks').select('id, project_id, title, status').ilike('title', `%${query}%`).limit(20),
  );
  const brain = await scopeFilter(
    db()
      .from('brain_sections')
      .select('project_id, section, body')
      .textSearch('body_tsv', query, { type: 'websearch' })
      .limit(20),
  );
  const activity = await scopeFilter(
    db().from('activity').select('project_id, verb, summary, created_at').ilike('summary', `%${query}%`).limit(20),
  );

  return {
    tasks: tasks.data ?? [],
    brain: brain.data ?? [],
    activity: activity.data ?? [],
  };
}

// ---------- context pack data gathering ----------
export async function getContextPackData(projectId: string, taskId?: string) {
  const project = await db().from('projects').select('name').eq('id', projectId).maybeSingle();

  let focusedTask = undefined as any;
  if (taskId) {
    const t = await db().from('tasks').select('*').eq('id', taskId).maybeSingle();
    if (t.data) {
      const comments = await db()
        .from('comments')
        .select('actor_type, body')
        .eq('task_id', taskId)
        .order('created_at');
      focusedTask = {
        id: t.data.id,
        title: t.data.title,
        description: t.data.description,
        acceptance_criteria: t.data.acceptance_criteria,
        comments: (comments.data ?? []).map((c: any) => ({ actor: c.actor_type, body: c.body })),
      };
    }
  }

  const brain = await db().from('brain_sections').select('section, body').eq('project_id', projectId);
  const related = await db()
    .from('tasks')
    .select('id, title, status, assignee_agent_id')
    .eq('project_id', projectId)
    .neq('status', 'done')
    .neq('status', 'cancelled')
    .limit(15);
  const activity = await db()
    .from('activity')
    .select('verb, summary, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(10);

  return {
    projectName: project.data?.name ?? 'unknown',
    focusedTask,
    brain: brain.data ?? [],
    relatedTasks: related.data ?? [],
    recentActivity: activity.data ?? [],
  };
}

// ---------- writes (each audited via recordActivity) ----------
export async function createTask(
  ctx: ActorContext,
  input: {
    projectId: string;
    title: string;
    description?: string;
    acceptanceCriteria?: string;
    parentTaskId?: string;
    priority?: string;
    dueAt?: string;
  },
) {
  const { data, error } = await db()
    .from('tasks')
    .insert({
      project_id: input.projectId,
      title: input.title,
      description: input.description ?? null,
      acceptance_criteria: input.acceptanceCriteria ?? null,
      parent_task_id: input.parentTaskId ?? null,
      priority: input.priority ?? 'medium',
      due_at: input.dueAt ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  await recordActivity({
    projectId: input.projectId,
    taskId: data.id,
    ctx,
    verb: 'task.created',
    summary: input.title,
  });
  return data;
}

export async function updateTask(
  ctx: ActorContext,
  taskId: string,
  patch: Record<string, unknown>,
  reason?: string,
) {
  const { data, error } = await db().from('tasks').update(patch).eq('id', taskId).select().single();
  if (error) throw error;
  await recordActivity({
    projectId: data.project_id,
    taskId,
    ctx,
    verb: 'task.updated',
    summary: `updated ${Object.keys(patch).join(', ')}`,
    reason,
  });
  return data;
}

export async function addComment(ctx: ActorContext, taskId: string, body: string) {
  const { data, error } = await db()
    .from('comments')
    .insert({ task_id: taskId, actor_type: ctx.actorType, actor_agent_id: ctx.agentId, body })
    .select()
    .single();
  if (error) throw error;
  const task = await db().from('tasks').select('project_id').eq('id', taskId).maybeSingle();
  await recordActivity({
    projectId: task.data?.project_id,
    taskId,
    ctx,
    verb: 'comment.added',
    summary: body.slice(0, 80),
  });
  return data;
}

export async function logSession(
  ctx: ActorContext,
  input: {
    projectId: string;
    taskId?: string;
    summary: string;
    changes?: unknown[];
    testsStatus?: string;
    blockedOn?: string;
    nextStep?: string;
  },
) {
  const { data, error } = await db()
    .from('session_logs')
    .insert({
      project_id: input.projectId,
      task_id: input.taskId ?? null,
      agent_id: ctx.agentId,
      summary: input.summary,
      changes: input.changes ?? [],
      tests_status: input.testsStatus ?? null,
      blocked_on: input.blockedOn ?? null,
      next_step: input.nextStep ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  await recordActivity({
    projectId: input.projectId,
    taskId: input.taskId,
    ctx,
    verb: 'session.logged',
    summary: input.summary.slice(0, 80),
  });
  return data;
}

/** Staged: writes a proposed brain_diff and an open approval. Nothing is merged here. */
export async function proposeBrainUpdate(
  ctx: ActorContext,
  input: {
    projectId: string;
    section: string;
    operation: 'add' | 'update' | 'remove';
    beforeText?: string;
    afterText?: string;
    evidenceSessionLogId?: string;
  },
) {
  const diff = await db()
    .from('brain_diffs')
    .insert({
      project_id: input.projectId,
      section: input.section,
      operation: input.operation,
      before_text: input.beforeText ?? null,
      after_text: input.afterText ?? null,
      evidence_session_log_id: input.evidenceSessionLogId ?? null,
      proposed_by_agent_id: ctx.agentId,
      status: 'proposed',
    })
    .select()
    .single();
  if (diff.error) throw diff.error;

  const approval = await db()
    .from('approvals')
    .insert({
      project_id: input.projectId,
      kind: 'brain_diff',
      title: `Brain ${input.operation}: ${input.section}`,
      payload: { brain_diff_id: diff.data.id },
      requested_by_agent_id: ctx.agentId,
      status: 'open',
    })
    .select()
    .single();
  if (approval.error) throw approval.error;

  await recordActivity({
    projectId: input.projectId,
    ctx,
    verb: 'brain.diff_proposed',
    summary: `${input.operation} ${input.section}`,
  });
  return { brain_diff_id: diff.data.id, approval_id: approval.data.id, status: 'proposed' };
}

// ---------- approvals (human-in-the-loop) ----------
export type ApprovalCard = {
  id: string;
  kind: string;
  title: string;
  payload: any;
  created_at: string;
  agentName: string | null;
  projectName: string | null;
  diff: { section: string; before: string | null; after: string | null; evidence: string | null } | null;
};

export async function getOpenApprovals(): Promise<ApprovalCard[]> {
  const db = serviceClient();
  const { data, error } = await db
    .from('approvals')
    .select('id, kind, title, payload, created_at, project_id, agents(name), projects(name)')
    .eq('status', 'open')
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = data ?? [];

  const diffIds = rows.map((r: any) => r.payload?.brain_diff_id).filter(Boolean);
  const diffs: Record<string, any> = {};
  if (diffIds.length) {
    const { data: d } = await db.from('brain_diffs').select('*').in('id', diffIds);
    for (const x of d ?? []) diffs[x.id] = x;
  }

  return rows.map((a: any) => {
    let diff = null;
    if (a.kind === 'brain_diff') {
      const bd = a.payload?.brain_diff_id ? diffs[a.payload.brain_diff_id] : null;
      diff = bd
        ? { section: bd.section, before: bd.before_text, after: bd.after_text, evidence: bd.evidence_session_log_id }
        : {
            section: a.payload?.section ?? null,
            before: a.payload?.before ?? null,
            after: a.payload?.after ?? null,
            evidence: a.payload?.evidence ?? null,
          };
    }
    return {
      id: a.id,
      kind: a.kind,
      title: a.title,
      payload: a.payload,
      created_at: a.created_at,
      agentName: a.agents?.name ?? null,
      projectName: a.projects?.name ?? null,
      diff,
    };
  });
}

/**
 * Resolve an approval. This is the ONLY place agent proposals become real.
 * Approving a brain_diff applies it to the Brain (bumping the section version) and
 * marks the diff merged. Rejecting marks it rejected. Nothing else is auto-sent.
 */
export async function resolveApproval(
  ctx: ActorContext,
  approvalId: string,
  decision: 'approve' | 'reject',
  note?: string,
) {
  const db = serviceClient();
  const nowIso = new Date().toISOString();
  const { data: appr, error } = await db.from('approvals').select('*').eq('id', approvalId).maybeSingle();
  if (error) throw error;
  if (!appr) throw new Error('approval not found');
  if (appr.status !== 'open') return { status: appr.status };

  if (appr.kind === 'brain_diff') {
    let section: string | null = appr.payload?.section ?? null;
    let after: string | null = appr.payload?.after ?? null;
    let diffId: string | null = appr.payload?.brain_diff_id ?? null;
    if (diffId) {
      const { data: bd } = await db.from('brain_diffs').select('*').eq('id', diffId).maybeSingle();
      if (bd) {
        section = bd.section;
        after = bd.after_text;
      }
    }
    if (decision === 'approve' && section && after != null) {
      const { data: existing } = await db
        .from('brain_sections')
        .select('id, version')
        .eq('project_id', appr.project_id)
        .eq('section', section)
        .maybeSingle();
      if (existing) {
        await db
          .from('brain_sections')
          .update({ body: after, version: existing.version + 1, updated_at: nowIso })
          .eq('id', existing.id);
      } else {
        await db.from('brain_sections').insert({ project_id: appr.project_id, section, body: after });
      }
    }
    if (diffId) {
      await db
        .from('brain_diffs')
        .update({ status: decision === 'approve' ? 'merged' : 'rejected', resolved_at: nowIso })
        .eq('id', diffId);
    }
  }

  await db
    .from('approvals')
    .update({
      status: decision === 'approve' ? 'approved' : 'rejected',
      resolved_at: nowIso,
      resolution_note: note ?? null,
    })
    .eq('id', approvalId);

  await recordActivity({
    projectId: appr.project_id,
    ctx,
    verb: `approval.${decision === 'approve' ? 'approved' : 'rejected'}`,
    summary: appr.title,
  });

  return { status: decision === 'approve' ? 'approved' : 'rejected' };
}

/** Staged: puts any proposed action in the human's Approvals inbox. Applies nothing. */
export async function requestApproval(
  ctx: ActorContext,
  input: { projectId?: string; kind: string; title: string; payload?: Record<string, unknown> },
) {
  const { data, error } = await db()
    .from('approvals')
    .insert({
      project_id: input.projectId ?? null,
      kind: input.kind,
      title: input.title,
      payload: input.payload ?? {},
      requested_by_agent_id: ctx.agentId,
      status: 'open',
    })
    .select()
    .single();
  if (error) throw error;
  await recordActivity({
    projectId: input.projectId,
    ctx,
    verb: 'approval.requested',
    summary: input.title,
  });
  return { approval_id: data.id, status: 'open' };
}
