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

// NOTE: write operations (createTask, updateTask, addComment, logSession,
// proposeBrainUpdate, requestApproval) are added in M1 alongside their MCP tools,
// each wrapping recordActivity so every mutation is audited.
