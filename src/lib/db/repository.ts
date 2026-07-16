import { serviceClient } from './client';

/**
 * The data-access layer. EVERY database read/write in ship-faster goes through here.
 * Rationale (docs/development-plan.md guardrails): one place to swap infra, enforce
 * scoping, and write audit rows. MCP tools and dashboard server actions call these —
 * they never touch the Supabase client directly.
 */

export type ActorContext = {
  agentId: string | null;      // null = owner/system
  accountId: string;           // tenancy anchor — every write stamps this; every read filters by it
  actorType: 'human' | 'agent';
  role: 'owner' | 'project_lead' | 'worker' | 'intake' | 'brain_sync';
  projectScope: string[];      // empty = all projects WITHIN the account
};

function db() {
  return serviceClient();
}

/**
 * Every table that carries an account_id anchor (migration 0004). Listing them as a type
 * rather than accepting `string` means a new tenant table cannot be read through the
 * scoped helpers until it is added here — the omission surfaces as a type error.
 */
export type TenantTable =
  | 'clients'
  | 'projects'
  | 'agents'
  | 'tasks'
  | 'milestones'
  | 'comments'
  | 'activity'
  | 'session_logs'
  | 'brain_sections'
  | 'brain_diffs'
  | 'approvals'
  | 'notifications';

/**
 * The ONLY way this file reads a tenant table.
 *
 * Everything here runs on the service-role key, which bypasses RLS — so RLS is
 * defense-in-depth, and *this* filter is the thing actually keeping accounts apart.
 * Routing reads through a helper that cannot be constructed without an ActorContext
 * makes "I forgot the account filter" a missing-argument type error instead of a silent
 * cross-tenant read. Do not call db().from(<a TenantTable>) directly below this line.
 */
function scopedSelect<T extends TenantTable, C extends string = '*'>(
  ctx: ActorContext,
  table: T,
  columns?: C,
) {
  // `columns` stays generic so supabase-js still infers row shapes from the literal select
  // string; widening it to `string` collapses every result to GenericStringError.
  return db()
    .from(table)
    .select((columns ?? '*') as C)
    .eq('account_id', ctx.accountId);
}

/** As scopedSelect, for writes: an UPDATE can never escape the actor's account. */
function scopedUpdate<T extends TenantTable>(
  ctx: ActorContext,
  table: T,
  patch: Record<string, unknown>,
) {
  return db().from(table).update(patch as never).eq('account_id', ctx.accountId);
}

/**
 * True if the actor may see/act on a given project.
 *
 * NOTE: this answers "is this project within my *project scope*" only — it says nothing
 * about tenancy. An owner has an empty projectScope, so this returns true for ANY id,
 * including another account's. It is safe only because every query that consumes the
 * result is account-filtered via scopedSelect/scopedUpdate; on its own it is not an
 * authorization check. Never gate a raw db() call on this alone.
 */
export function inScope(ctx: ActorContext, projectId: string): boolean {
  return ctx.projectScope.length === 0 || ctx.projectScope.includes(projectId);
}

/**
 * Resolve the account for the two credentials that predate accounts: the OWNER_TOKEN and
 * the (still un-authenticated) dashboard. OWNER_ACCOUNT_ID wins; otherwise the sole
 * account is unambiguous.
 *
 * This THROWS once a second account exists rather than guessing — that failure is the
 * point: it makes real auth a hard prerequisite for the first signup instead of silently
 * serving one tenant another tenant's data.
 */
export async function resolveSoleAccountId(): Promise<string> {
  if (process.env.OWNER_ACCOUNT_ID) return process.env.OWNER_ACCOUNT_ID;
  const { data, error } = await db().from('accounts').select('id').limit(2);
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('no account exists — run migration 0004');
  if (data.length > 1) {
    throw new Error('multiple accounts exist — set OWNER_ACCOUNT_ID, or wire Supabase Auth (M7 phase 3)');
  }
  return data[0]!.id;
}

// ---------- projects ----------
export async function listProjects(ctx: ActorContext) {
  let q = scopedSelect(ctx, 'projects', '*, clients(name)').order('created_at', { ascending: false });
  if (ctx.projectScope.length > 0) q = q.in('id', ctx.projectScope);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/**
 * Agent names are unique per account (0004), so a bare name lookup is ambiguous across
 * accounts — the caller must say which account is asking.
 */
export async function getAgentByName(accountId: string, name: string) {
  const { data, error } = await db()
    .from('agents')
    .select('id, name, role, account_id, project_scope, revoked_at')
    .eq('account_id', accountId)
    .eq('name', name)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getProject(ctx: ActorContext, projectId: string) {
  if (!inScope(ctx, projectId)) return null;
  const { data, error } = await scopedSelect(ctx, 'projects', '*, clients(*), milestones(*)')
    .eq('id', projectId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Resolve a project the actor may actually act on, or throw. Every write that hangs a row
 * off a project_id must pass through here first.
 *
 * Stamping ctx.accountId on a row whose project_id points into another account would mint
 * a row that passes every later account filter while describing someone else's project —
 * mixed-tenancy data that no amount of read scoping can untangle afterwards.
 */
export async function requireProject(ctx: ActorContext, projectId: string) {
  if (!inScope(ctx, projectId)) throw new Error('project out of actor scope');
  const { data, error } = await scopedSelect(ctx, 'projects', 'id, account_id')
    .eq('id', projectId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('project not found');
  return data;
}

// ---------- milestones (money-aware) ----------
export type MilestoneStatus = 'pending' | 'invoiced' | 'paid';

export async function getMilestone(ctx: ActorContext, milestoneId: string) {
  let q = scopedSelect(ctx, 'milestones').eq('id', milestoneId);
  if (ctx.projectScope.length > 0) q = q.in('project_id', ctx.projectScope);
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  return data;
}

/** Create a milestone (a money figure — e.g. "5k remaining to collect") and audit it. */
export async function createMilestone(
  ctx: ActorContext,
  input: {
    projectId: string;
    title: string;
    amount: number;
    currency?: string;
    status?: MilestoneStatus;
    dueAt?: string;
  },
) {
  await requireProject(ctx, input.projectId);
  const { data, error } = await db()
    .from('milestones')
    .insert({
      account_id: ctx.accountId,
      project_id: input.projectId,
      title: input.title,
      amount: input.amount,
      currency: input.currency ?? 'USD',
      status: input.status ?? 'pending',
      due_at: input.dueAt ?? null,
      paid_at: input.status === 'paid' ? new Date().toISOString() : null,
    })
    .select()
    .single();
  if (error) throw error;
  await recordActivity({
    projectId: input.projectId,
    ctx,
    verb: 'milestone.created',
    summary: `${input.title}: ${input.amount} ${data.currency} (${data.status})`,
    metadata: { milestone_id: data.id, amount: input.amount, currency: data.currency, status: data.status },
  });
  return data;
}

/** Update a milestone's money fields and audit exactly what changed. */
export async function updateMilestone(
  ctx: ActorContext,
  milestoneId: string,
  patch: {
    title?: string;
    amount?: number;
    currency?: string;
    status?: MilestoneStatus;
    dueAt?: string | null;
  },
) {
  const update: Record<string, unknown> = {};
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.amount !== undefined) update.amount = patch.amount;
  if (patch.currency !== undefined) update.currency = patch.currency;
  if (patch.dueAt !== undefined) update.due_at = patch.dueAt;
  if (patch.status !== undefined) {
    update.status = patch.status;
    // Keep paid_at consistent with status so owed/paid math stays honest.
    update.paid_at = patch.status === 'paid' ? new Date().toISOString() : null;
  }
  const { data, error } = await scopedUpdate(ctx, 'milestones', update)
    .eq('id', milestoneId)
    .select()
    .single();
  if (error) throw error;
  await recordActivity({
    projectId: data.project_id,
    ctx,
    verb: 'milestone.updated',
    summary: `${data.title}: ${data.amount} ${data.currency} (${data.status})`,
    metadata: { milestone_id: milestoneId, changed: Object.keys(update) },
  });
  return data;
}

/** Slugs are unique per account (0004) — unscoped, this would return an arbitrary tenant's project. */
export async function getProjectBySlug(ctx: ActorContext, slug: string) {
  const { data, error } = await scopedSelect(ctx, 'projects', '*, clients(*), milestones(*)')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  if (!data || !inScope(ctx, data.id)) return null;
  return data;
}

/** Slugify a project name: lowercase, spaces/punctuation → hyphens. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Account-scoped: two accounts may each have a client called "Mazaya" without colliding. */
export async function getClientByName(accountId: string, name: string) {
  const { data, error } = await db()
    .from('clients')
    .select('*')
    .eq('account_id', accountId)
    .ilike('name', name)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Slug-clash check for project creation. Account-scoped on purpose: two accounts may each
 * run a project called "bookitfly", so a global clash check would wrongly reject the
 * second one — and leak that the first exists.
 */
export async function getProjectBySlugRaw(ctx: ActorContext, slug: string) {
  const { data, error } = await scopedSelect(ctx, 'projects', 'id, slug').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return data;
}

/** Create (or reuse by name) a client, then a project under it. Audited. */
export async function createProject(
  ctx: ActorContext,
  input: {
    name: string;
    slug: string;
    clientName?: string;
    pricingModel?: string;
    status?: string;
  },
) {
  let clientId: string | null = null;
  if (input.clientName) {
    const existing = await getClientByName(ctx.accountId, input.clientName);
    if (existing) {
      clientId = existing.id;
    } else {
      const { data: client, error: cErr } = await db()
        .from('clients')
        .insert({ name: input.clientName, account_id: ctx.accountId })
        .select()
        .single();
      if (cErr) throw cErr;
      clientId = client.id;
    }
  }

  const { data, error } = await db()
    .from('projects')
    .insert({
      account_id: ctx.accountId,
      name: input.name,
      slug: input.slug,
      client_id: clientId,
      pricing_model: input.pricingModel ?? null,
      status: input.status ?? 'active',
    })
    .select('*, clients(*)')
    .single();
  if (error) throw error;

  await recordActivity({
    projectId: data.id,
    ctx,
    verb: 'project.created',
    summary: `${input.name}${input.clientName ? ` (client: ${input.clientName})` : ''}`,
    metadata: { project_id: data.id, slug: input.slug, client_id: clientId },
  });
  return data;
}

export async function getProjectsOverviewData(ctx: ActorContext) {
  const [projects, tasks, milestones, agents] = await Promise.all([
    scopedSelect(ctx, 'projects', 'id, name, slug, status, clients(name)').order('name'),
    scopedSelect(ctx, 'tasks', 'id, project_id, status'),
    scopedSelect(ctx, 'milestones', 'project_id, title, amount, currency, status'),
    scopedSelect(ctx, 'agents', 'project_scope, revoked_at'),
  ]);
  if (projects.error) throw projects.error;
  if (tasks.error) throw tasks.error;
  if (milestones.error) throw milestones.error;
  if (agents.error) throw agents.error;
  return {
    projects: projects.data ?? [],
    tasks: tasks.data ?? [],
    milestones: milestones.data ?? [],
    agents: agents.data ?? [],
  };
}

// ---------- tasks ----------
export type TaskFilter = {
  projectId?: string;
  status?: string;
  assigneeAgentId?: string;
  dueBefore?: string;
};

export async function listTasks(ctx: ActorContext, filter: TaskFilter = {}) {
  let q = scopedSelect(ctx, 'tasks').order('updated_at', { ascending: false });
  if (filter.projectId) q = q.eq('project_id', filter.projectId);
  if (filter.status) q = q.eq('status', filter.status);
  if (filter.assigneeAgentId) q = q.eq('assignee_agent_id', filter.assigneeAgentId);
  if (filter.dueBefore) q = q.lte('due_at', filter.dueBefore);
  if (ctx.projectScope.length > 0) q = q.in('project_id', ctx.projectScope);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/**
 * Returns null for a task outside the actor's account OR project scope — the two cases are
 * deliberately indistinguishable to the caller, so a task id cannot be used to probe for
 * the existence of work in another tenant.
 */
export async function getTask(ctx: ActorContext, taskId: string) {
  const { data, error } = await scopedSelect(ctx, 'tasks').eq('id', taskId).maybeSingle();
  if (error) throw error;
  if (!data || !inScope(ctx, data.project_id)) return null;
  return data;
}

export async function getProjectBoardTasks(ctx: ActorContext, projectId: string) {
  if (!inScope(ctx, projectId)) return [];
  const { data, error } = await scopedSelect(
    ctx,
    'tasks',
    'id, title, status, priority, assignee_agent_id, assignee_is_human, due_at, acceptance_criteria, tokens_spent, agents!tasks_assignee_agent_id_fkey(name), creator:agents!tasks_created_by_agent_id_fkey(name)',
  )
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getTaskDetailData(ctx: ActorContext, taskId: string) {
  const task = await scopedSelect(
    ctx,
    'tasks',
    '*, projects(name, slug), agents!tasks_assignee_agent_id_fkey(name), creator:agents!tasks_created_by_agent_id_fkey(name)',
  )
    .eq('id', taskId)
    .maybeSingle();
  if (task.error) throw task.error;
  if (!task.data || !inScope(ctx, task.data.project_id)) return null;

  const comments = await scopedSelect(ctx, 'comments', 'body, actor_type, created_at, agents(name)')
    .eq('task_id', taskId)
    .order('created_at');
  if (comments.error) throw comments.error;

  return { task: task.data, comments: comments.data ?? [] };
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
    account_id: input.ctx.accountId,
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
export async function getBrain(ctx: ActorContext, projectId: string) {
  if (!inScope(ctx, projectId)) return [];
  const { data, error } = await scopedSelect(ctx, 'brain_sections')
    .eq('project_id', projectId)
    .order('section');
  if (error) throw error;
  return data ?? [];
}

export async function getBrainViewData(ctx: ActorContext, projectId: string) {
  if (!inScope(ctx, projectId)) return { sections: [], proposed: [] };
  const [sections, diffs] = await Promise.all([
    scopedSelect(ctx, 'brain_sections', 'section, body, version, updated_at').eq('project_id', projectId),
    scopedSelect(ctx, 'brain_diffs', 'section, operation, after_text, status, agents(name)')
      .eq('project_id', projectId)
      .eq('status', 'proposed'),
  ]);
  if (sections.error) throw sections.error;
  if (diffs.error) throw diffs.error;
  return { sections: sections.data ?? [], proposed: diffs.data ?? [] };
}

export async function getProjectActivityData(ctx: ActorContext, projectId: string) {
  if (!inScope(ctx, projectId)) return { activity: [], sessions: [] };
  const [activity, sessions] = await Promise.all([
    scopedSelect(ctx, 'activity', 'id, verb, summary, reason, actor_type, created_at, agents(name)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(40),
    scopedSelect(
      ctx,
      'session_logs',
      'id, summary, changes, tests_status, blocked_on, next_step, created_at, agents(name)',
    )
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(15),
  ]);
  if (activity.error) throw activity.error;
  if (sessions.error) throw sessions.error;
  return { activity: activity.data ?? [], sessions: sessions.data ?? [] };
}

export async function getMoneyOverviewData(ctx: ActorContext) {
  let q = scopedSelect(
    ctx,
    'milestones',
    'project_id, title, amount, currency, status, due_at, paid_at, projects(name, slug, clients(name))',
  );
  if (ctx.projectScope.length > 0) q = q.in('project_id', ctx.projectScope);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getClientsViewData(ctx: ActorContext) {
  const [clients, projects, milestones] = await Promise.all([
    scopedSelect(ctx, 'clients').order('name'),
    scopedSelect(ctx, 'projects', 'id, name, slug, client_id'),
    scopedSelect(ctx, 'milestones', 'amount, status, project_id'),
  ]);
  if (clients.error) throw clients.error;
  if (projects.error) throw projects.error;
  if (milestones.error) throw milestones.error;
  return {
    clients: clients.data ?? [],
    projects: projects.data ?? [],
    milestones: milestones.data ?? [],
  };
}

export async function getAgentsViewData(ctx: ActorContext) {
  const [agents, projects, taskTokens, sessionTokens] = await Promise.all([
    scopedSelect(ctx, 'agents').order('created_at', { ascending: false }),
    scopedSelect(ctx, 'projects', 'id, name'),
    scopedSelect(ctx, 'tasks', 'created_by_agent_id, tokens_spent').gt('tokens_spent', 0),
    scopedSelect(ctx, 'session_logs', 'agent_id, tokens_spent').gt('tokens_spent', 0),
  ]);
  if (agents.error) throw agents.error;
  if (projects.error) throw projects.error;
  if (taskTokens.error) throw taskTokens.error;
  if (sessionTokens.error) throw sessionTokens.error;
  return {
    agents: agents.data ?? [],
    projects: projects.data ?? [],
    taskTokens: taskTokens.data ?? [],
    sessionTokens: sessionTokens.data ?? [],
  };
}

export async function getPendingApprovalCountData(ctx: ActorContext): Promise<number> {
  const { count, error } = await db()
    .from('approvals')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', ctx.accountId)
    .eq('status', 'open');
  if (error) throw error;
  return count ?? 0;
}

export async function getTodayDataModel(ctx: ActorContext) {
  const [approvals, due, blocked, projects] = await Promise.all([
    scopedSelect(
      ctx,
      'approvals',
      'id, kind, title, status, requested_by_agent_id, project_id, agents(name), projects(name)',
    )
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(5),
    scopedSelect(ctx, 'tasks', 'id, title, status, due_at, project_id, projects(name)')
      .not('status', 'in', '(done,cancelled)')
      .not('due_at', 'is', null)
      .lte('due_at', new Date(Date.now() + 3 * 864e5).toISOString())
      .order('due_at', { ascending: true })
      .limit(8),
    scopedSelect(
      ctx,
      'tasks',
      'id, title, status, project_id, assignee_agent_id, agents!tasks_assignee_agent_id_fkey(name), projects(name)',
    )
      .eq('status', 'blocked')
      .limit(8),
    scopedSelect(ctx, 'projects', 'id, name, slug'),
  ]);
  if (approvals.error) throw approvals.error;
  if (due.error) throw due.error;
  if (blocked.error) throw blocked.error;
  if (projects.error) throw projects.error;

  const withTasks = await scopedSelect(ctx, 'tasks', 'project_id').not('status', 'in', '(done,cancelled)');
  if (withTasks.error) throw withTasks.error;

  return {
    approvals: approvals.data ?? [],
    due: due.data ?? [],
    blocked: blocked.data ?? [],
    projects: projects.data ?? [],
    openTaskProjectIds: (withTasks.data ?? []).map((t: any) => t.project_id),
  };
}

// ---------- project lead triage data gathering ----------
export async function getProjectTriageData(ctx: ActorContext, projectId: string) {
  if (!inScope(ctx, projectId)) throw new Error('project out of actor scope');

  const [project, tasks, activity, sessions, brain, milestones] = await Promise.all([
    scopedSelect(ctx, 'projects', 'id, name, slug, status, updated_at, clients(name)')
      .eq('id', projectId)
      .maybeSingle(),
    scopedSelect(
      ctx,
      'tasks',
      'id, project_id, title, status, priority, assignee_agent_id, assignee_is_human, due_at, updated_at, created_at, human_touched_at, acceptance_criteria',
    )
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false }),
    scopedSelect(ctx, 'activity', 'id, project_id, task_id, verb, summary, actor_type, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(40),
    scopedSelect(ctx, 'session_logs', 'id, project_id, task_id, summary, blocked_on, next_step, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(40),
    scopedSelect(ctx, 'brain_sections', 'id, project_id, section, body, version, updated_at')
      .eq('project_id', projectId)
      .order('section'),
    scopedSelect(ctx, 'milestones', 'id, project_id, title, status, due_at, amount, currency')
      .eq('project_id', projectId)
      .order('due_at', { ascending: true }),
  ]);

  if (project.error) throw project.error;
  if (tasks.error) throw tasks.error;
  if (activity.error) throw activity.error;
  if (sessions.error) throw sessions.error;
  if (brain.error) throw brain.error;
  if (milestones.error) throw milestones.error;
  if (!project.data) throw new Error('project not found');

  return {
    project: project.data,
    tasks: tasks.data ?? [],
    activity: activity.data ?? [],
    sessions: sessions.data ?? [],
    brain: brain.data ?? [],
    milestones: milestones.data ?? [],
  };
}

export async function listProjectTriageData(ctx: ActorContext) {
  const projects = await listProjects(ctx);
  return Promise.all(projects.map((project: any) => getProjectTriageData(ctx, project.id)));
}

// ---------- search (tasks + brain + activity) ----------
export async function search(ctx: ActorContext, query: string, projectId?: string) {
  if (projectId && !inScope(ctx, projectId)) return { tasks: [], brain: [], activity: [] };
  const scope = projectId ? [projectId] : ctx.projectScope;
  const scopeFilter = (q: any) => (scope.length > 0 ? q.in('project_id', scope) : q);

  const tasks = await scopeFilter(
    scopedSelect(ctx, 'tasks', 'id, project_id, title, status').ilike('title', `%${query}%`).limit(20),
  );
  const brain = await scopeFilter(
    scopedSelect(ctx, 'brain_sections', 'project_id, section, body')
      .textSearch('body_tsv', query, { type: 'websearch' })
      .limit(20),
  );
  const activity = await scopeFilter(
    scopedSelect(ctx, 'activity', 'project_id, verb, summary, created_at')
      .ilike('summary', `%${query}%`)
      .limit(20),
  );

  return {
    tasks: tasks.data ?? [],
    brain: brain.data ?? [],
    activity: activity.data ?? [],
  };
}

// ---------- context pack data gathering ----------
/**
 * Assemble the raw material for a task's Context Pack.
 *
 * The focused task is fetched with BOTH its id and the pack's project_id, not by id alone.
 * Fetching by id let a caller pass a project they can see plus a task from a project they
 * cannot, and the other project's title, description, acceptance criteria and full comment
 * thread would be assembled into the pack — the exact cross-project context leak the
 * permission model exists to prevent. A task id that does not live in projectId now yields
 * no focused task rather than someone else's work.
 */
export async function getContextPackData(ctx: ActorContext, projectId: string, taskId?: string) {
  if (!inScope(ctx, projectId)) throw new Error('project out of actor scope');
  const project = await scopedSelect(ctx, 'projects', 'name').eq('id', projectId).maybeSingle();
  if (!project.data) throw new Error('project not found');

  let focusedTask = undefined as any;
  if (taskId) {
    const t = await scopedSelect(ctx, 'tasks')
      .eq('id', taskId)
      .eq('project_id', projectId)
      .maybeSingle();
    if (t.data) {
      const comments = await scopedSelect(ctx, 'comments', 'actor_type, body')
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

  const brain = await scopedSelect(ctx, 'brain_sections', 'section, body').eq('project_id', projectId);
  const related = await scopedSelect(ctx, 'tasks', 'id, title, status, assignee_agent_id')
    .eq('project_id', projectId)
    .neq('status', 'done')
    .neq('status', 'cancelled')
    .limit(15);
  const activity = await scopedSelect(ctx, 'activity', 'verb, summary, created_at')
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
    tokensSpent?: number;
    assigneeAgentId?: string | null;
  },
) {
  await requireProject(ctx, input.projectId);
  const { data, error } = await db()
    .from('tasks')
    .insert({
      account_id: ctx.accountId,
      project_id: input.projectId,
      title: input.title,
      description: input.description ?? null,
      acceptance_criteria: input.acceptanceCriteria ?? null,
      parent_task_id: input.parentTaskId ?? null,
      priority: input.priority ?? 'medium',
      due_at: input.dueAt ?? null,
      created_by_agent_id: ctx.agentId,
      tokens_spent: Math.max(0, Math.round(input.tokensSpent ?? 0)),
      assignee_agent_id: input.assigneeAgentId ?? null,
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
    metadata: input.tokensSpent ? { tokens_spent: input.tokensSpent } : undefined,
  });
  return data;
}

export async function updateTask(
  ctx: ActorContext,
  taskId: string,
  patch: Record<string, unknown>,
  reason?: string,
) {
  // Re-read through the scoped path rather than trusting the caller's earlier lookup: this
  // is a write, so it must establish for itself that the task is the actor's to change.
  const existing = await getTask(ctx, taskId);
  if (!existing) throw new Error('task not found');
  const { data, error } = await scopedUpdate(ctx, 'tasks', patch).eq('id', taskId).select().single();
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

/** Agents that may be assigned work on a project: scoped to it (or all-projects), not revoked. */
export async function getAssignableAgents(ctx: ActorContext, projectId: string) {
  if (!inScope(ctx, projectId)) return [];
  const { data, error } = await scopedSelect(ctx, 'agents', 'id, name, role, project_scope')
    .is('revoked_at', null)
    .order('name');
  if (error) throw error;
  return (data ?? []).filter(
    (a: any) => (a.project_scope ?? []).length === 0 || a.project_scope.includes(projectId),
  );
}

/** The calling agent's own identity, for self-introduction. */
export async function getSelf(ctx: ActorContext) {
  if (!ctx.agentId) {
    return { agentId: null, name: 'owner', role: ctx.role, projects: [] as string[] };
  }
  const { data } = await scopedSelect(ctx, 'agents', 'name, role, project_scope')
    .eq('id', ctx.agentId)
    .maybeSingle();
  let projects: string[] = [];
  if (data?.project_scope?.length) {
    const p = await scopedSelect(ctx, 'projects', 'name').in('id', data.project_scope);
    projects = (p.data ?? []).map((x: any) => x.name);
  }
  return { agentId: ctx.agentId, name: data?.name ?? null, role: ctx.role, projects };
}

/** An agent renames itself (e.g. a friendlier name the user chose). */
export async function renameSelf(ctx: ActorContext, newName: string) {
  if (!ctx.agentId) throw new Error('only agents can rename themselves');
  const clean = newName.trim();
  if (!clean) throw new Error('name is empty');
  const { data, error } = await scopedUpdate(ctx, 'agents', { name: clean })
    .eq('id', ctx.agentId)
    .select('name')
    .single();
  if (error) throw error;
  await recordActivity({ ctx, verb: 'agent.renamed', summary: `renamed self to ${clean}` });
  return data;
}

export async function addComment(ctx: ActorContext, taskId: string, body: string, reason?: string) {
  // Establish the task is the actor's BEFORE writing — comments carry no project_id of
  // their own, so a comment on an unreachable task would be an orphan nobody can moderate.
  const task = await getTask(ctx, taskId);
  if (!task) throw new Error('task not found');

  const { data, error } = await db()
    .from('comments')
    .insert({
      account_id: ctx.accountId,
      task_id: taskId,
      actor_type: ctx.actorType,
      actor_agent_id: ctx.agentId,
      body,
    })
    .select()
    .single();
  if (error) throw error;
  await recordActivity({
    projectId: task.project_id,
    taskId,
    ctx,
    verb: 'comment.added',
    summary: body.slice(0, 80),
    reason,
  });
  return data;
}

// ---------- notifications (agent-to-agent mentions + durable inbox) ----------

/** Resolve mention names to agent rows (case-insensitive exact match). Unknown names are dropped. */
export async function resolveAgentsByName(
  accountId: string,
  names: string[],
): Promise<{ id: string; name: string }[]> {
  if (names.length === 0) return [];
  // Account-scoped: an @mention must never resolve to another tenant's agent.
  const { data, error } = await db()
    .from('agents')
    .select('id, name')
    .eq('account_id', accountId)
    .is('revoked_at', null);
  if (error) throw error;
  const wanted = new Set(names.map((n) => n.toLowerCase()));
  return (data ?? []).filter((a: any) => wanted.has(String(a.name).toLowerCase()));
}

/**
 * Drop a notification row for each mentioned agent (self-mentions skipped) and record one
 * audited `comment.mentioned` activity. Returns the recipients actually notified.
 */
export async function createMentionNotifications(
  ctx: ActorContext,
  input: {
    projectId: string | null;
    taskId: string;
    commentId: string;
    body: string;
    recipients: { id: string; name: string }[];
  },
): Promise<{ id: string; name: string }[]> {
  const recipients = input.recipients.filter((r) => r.id !== ctx.agentId);
  if (recipients.length === 0) return [];

  const rows = recipients.map((r) => ({
    recipient_agent_id: r.id,
    actor_agent_id: ctx.agentId,
    account_id: ctx.accountId,
    project_id: input.projectId,
    task_id: input.taskId,
    comment_id: input.commentId,
    kind: 'mention' as const,
    body: input.body.slice(0, 280),
  }));
  const { error } = await db().from('notifications').insert(rows);
  if (error) throw error;

  await recordActivity({
    projectId: input.projectId,
    taskId: input.taskId,
    ctx,
    verb: 'comment.mentioned',
    summary: `mentioned ${recipients.map((r) => r.name).join(', ')}`.slice(0, 80),
    metadata: { recipients: recipients.map((r) => r.name), comment_id: input.commentId },
  });
  return recipients;
}

const INBOX_SELECT =
  'id, actor_agent_id, project_id, task_id, comment_id, kind, body, read_at, created_at, actor:agents!notifications_actor_agent_id_fkey(name), project:projects(name)';

/**
 * The caller's notifications, newest first. Unread-only unless includeRead.
 *
 * Keyed on the caller's own agent id, which is itself account-bound — the account filter is
 * belt-and-braces so this stays correct if a future caller ever passes an id it didn't
 * authenticate as.
 */
export async function listInbox(
  ctx: ActorContext,
  opts: { includeRead?: boolean; limit?: number } = {},
) {
  if (!ctx.agentId) return [];
  let q = scopedSelect(ctx, 'notifications', INBOX_SELECT)
    .eq('recipient_agent_id', ctx.agentId)
    .order('created_at', { ascending: false })
    .limit(Math.min(opts.limit ?? 50, 200));
  if (!opts.includeRead) q = q.is('read_at', null);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/** One long-poll tick: unread notifications strictly newer than `sinceIso` (oldest first). */
export async function pollInboxSince(ctx: ActorContext, sinceIso: string, limit = 50) {
  if (!ctx.agentId) return [];
  const { data, error } = await scopedSelect(ctx, 'notifications', INBOX_SELECT)
    .eq('recipient_agent_id', ctx.agentId)
    .is('read_at', null)
    .gt('created_at', sinceIso)
    .order('created_at', { ascending: true })
    .limit(Math.min(limit, 200));
  if (error) throw error;
  return data ?? [];
}

/** Mark the caller's notifications read. Scoped to recipient = caller; ids optional (all unread if omitted). */
export async function markNotificationsRead(ctx: ActorContext, ids?: string[]): Promise<number> {
  if (!ctx.agentId) return 0;
  let q = scopedUpdate(ctx, 'notifications', { read_at: new Date().toISOString() })
    .eq('recipient_agent_id', ctx.agentId)
    .is('read_at', null);
  if (ids && ids.length > 0) q = q.in('id', ids);
  const { data, error } = await q.select('id');
  if (error) throw error;
  return (data ?? []).length;
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
    tokensSpent?: number;
  },
) {
  await requireProject(ctx, input.projectId);
  const { data, error } = await db()
    .from('session_logs')
    .insert({
      account_id: ctx.accountId,
      project_id: input.projectId,
      task_id: input.taskId ?? null,
      agent_id: ctx.agentId,
      summary: input.summary,
      changes: input.changes ?? [],
      tests_status: input.testsStatus ?? null,
      blocked_on: input.blockedOn ?? null,
      next_step: input.nextStep ?? null,
      tokens_spent: Math.max(0, Math.round(input.tokensSpent ?? 0)),
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
  await requireProject(ctx, input.projectId);
  const diff = await db()
    .from('brain_diffs')
    .insert({
      account_id: ctx.accountId,
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
      account_id: ctx.accountId,
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

export async function getOpenApprovals(ctx: ActorContext): Promise<ApprovalCard[]> {
  const { data, error } = await scopedSelect(
    ctx,
    'approvals',
    'id, kind, title, payload, created_at, project_id, agents(name), projects(name)',
  )
    .eq('status', 'open')
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = data ?? [];

  // The diff ids come out of approval payloads we just account-filtered, but re-scoping the
  // fetch keeps a tampered payload from pulling another account's diff into the review card.
  const diffIds = rows.map((r: any) => r.payload?.brain_diff_id).filter(Boolean);
  const diffs: Record<string, any> = {};
  if (diffIds.length) {
    const { data: d } = await scopedSelect(ctx, 'brain_diffs').in('id', diffIds);
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
  const nowIso = new Date().toISOString();
  // Account-scoped read: an approval id alone must not let one account resolve another's
  // proposal. A miss is reported as not-found rather than forbidden, so an id cannot be
  // used to probe for approvals that exist in other tenants.
  const { data: appr, error } = await scopedSelect(ctx, 'approvals').eq('id', approvalId).maybeSingle();
  if (error) throw error;
  if (!appr) throw new Error('approval not found');
  if (appr.status !== 'open') return { status: appr.status };

  if (appr.kind === 'brain_diff') {
    let section: string | null = appr.payload?.section ?? null;
    let after: string | null = appr.payload?.after ?? null;
    let diffId: string | null = appr.payload?.brain_diff_id ?? null;
    if (diffId) {
      const { data: bd } = await scopedSelect(ctx, 'brain_diffs').eq('id', diffId).maybeSingle();
      if (bd) {
        section = bd.section;
        after = bd.after_text;
      }
    }
    if (decision === 'approve' && section && after != null) {
      const { data: existing } = await scopedSelect(ctx, 'brain_sections', 'id, version')
        .eq('project_id', appr.project_id)
        .eq('section', section)
        .maybeSingle();
      if (existing) {
        await scopedUpdate(ctx, 'brain_sections', {
          body: after,
          version: existing.version + 1,
          updated_at: nowIso,
        }).eq('id', existing.id);
      } else {
        await db()
          .from('brain_sections')
          .insert({ account_id: appr.account_id, project_id: appr.project_id, section, body: after });
      }
    }
    if (diffId) {
      await scopedUpdate(ctx, 'brain_diffs', {
        status: decision === 'approve' ? 'merged' : 'rejected',
        resolved_at: nowIso,
      }).eq('id', diffId);
    }
  }

  await scopedUpdate(ctx, 'approvals', {
    status: decision === 'approve' ? 'approved' : 'rejected',
    resolved_at: nowIso,
    resolution_note: note ?? null,
  }).eq('id', approvalId);

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
  if (input.projectId) await requireProject(ctx, input.projectId);
  const { data, error } = await db()
    .from('approvals')
    .insert({
      account_id: ctx.accountId,
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
