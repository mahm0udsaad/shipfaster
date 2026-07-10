import { serviceClient } from './db/client';
import { getContextPackData } from './db/repository';
import { assembleContextPack } from './context/pack';

/** Dashboard read-views. Server-only aggregation over the live DB. */

const OPEN = ['todo', 'in_progress', 'blocked', 'review'];

export async function getProjectsOverview() {
  const db = serviceClient();
  const [projects, tasks, milestones, agents] = await Promise.all([
    db.from('projects').select('id, name, slug, status, clients(name)').order('name'),
    db.from('tasks').select('id, project_id, status'),
    db.from('milestones').select('project_id, title, amount, currency, status'),
    db.from('agents').select('project_scope, revoked_at'),
  ]);

  return (projects.data ?? []).map((p: any) => {
    const pTasks = (tasks.data ?? []).filter((t: any) => t.project_id === p.id);
    const open = pTasks.filter((t: any) => OPEN.includes(t.status)).length;
    const pMs = (milestones.data ?? []).filter((m: any) => m.project_id === p.id);
    const next = pMs.find((m: any) => m.status !== 'paid');
    const owed = pMs.filter((m: any) => m.status !== 'paid').reduce((s: number, m: any) => s + Number(m.amount), 0);
    const agentActive = (agents.data ?? []).some(
      (a: any) => !a.revoked_at && (a.project_scope ?? []).includes(p.id),
    );
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      status: p.status,
      client: p.clients?.name ?? null,
      openTasks: open,
      nextMilestone: next ? { title: next.title, amount: Number(next.amount), currency: next.currency } : null,
      owed,
      agentActive,
      stale: open === 0,
    };
  });
}

export async function getProjectBySlug(slug: string) {
  const db = serviceClient();
  const { data } = await db
    .from('projects')
    .select('*, clients(*), milestones(*)')
    .eq('slug', slug)
    .maybeSingle();
  return data;
}

export async function getBoard(projectId: string) {
  const db = serviceClient();
  const { data } = await db
    .from('tasks')
    .select('id, title, status, priority, assignee_agent_id, assignee_is_human, due_at, acceptance_criteria, agents(name)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  const cols: Record<string, any[]> = { todo: [], in_progress: [], blocked: [], review: [], done: [] };
  for (const t of data ?? []) {
    const col = cols[t.status];
    if (col) col.push(t);
  }
  return cols;
}

export async function getBrainView(projectId: string) {
  const db = serviceClient();
  const [sections, diffs] = await Promise.all([
    db.from('brain_sections').select('section, body, version, updated_at').eq('project_id', projectId),
    db
      .from('brain_diffs')
      .select('section, operation, after_text, status, agents(name)')
      .eq('project_id', projectId)
      .eq('status', 'proposed'),
  ]);
  return { sections: sections.data ?? [], proposed: diffs.data ?? [] };
}

export async function getActivityView(projectId: string) {
  const db = serviceClient();
  const [activity, sessions] = await Promise.all([
    db
      .from('activity')
      .select('id, verb, summary, reason, actor_type, created_at, agents(name)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(40),
    db
      .from('session_logs')
      .select('id, summary, changes, tests_status, blocked_on, next_step, created_at, agents(name)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(15),
  ]);
  return { activity: activity.data ?? [], sessions: sessions.data ?? [] };
}

export async function getTaskDetail(taskId: string) {
  const db = serviceClient();
  const { data: task } = await db
    .from('tasks')
    .select('*, projects(name, slug), agents(name)')
    .eq('id', taskId)
    .maybeSingle();
  if (!task) return null;
  const { data: comments } = await db
    .from('comments')
    .select('body, actor_type, created_at, agents(name)')
    .eq('task_id', taskId)
    .order('created_at');
  const packData = await getContextPackData(task.project_id, taskId);
  const pack = assembleContextPack({
    projectName: packData.projectName,
    focusedTask: packData.focusedTask,
    brain: packData.brain,
    relatedTasks: packData.relatedTasks,
    recentActivity: packData.recentActivity,
    tokenBudget: 4000,
  });
  return { task, comments: comments ?? [], pack };
}

export async function getMoneyOverview() {
  const db = serviceClient();
  const { data } = await db
    .from('milestones')
    .select('title, amount, currency, status, due_at, paid_at, projects(name, slug, clients(name))');
  const rows = data ?? [];
  const byCurrency: Record<string, { owed: number; paid: number }> = {};
  for (const m of rows) {
    const c = m.currency ?? 'USD';
    byCurrency[c] ??= { owed: 0, paid: 0 };
    if (m.status === 'paid') byCurrency[c].paid += Number(m.amount);
    else byCurrency[c].owed += Number(m.amount);
  }
  const unpaid = rows
    .filter((m: any) => m.status !== 'paid' && Number(m.amount) > 0)
    .sort((a: any, b: any) => Number(b.amount) - Number(a.amount));
  return { byCurrency, unpaid, all: rows };
}

export async function getClientsView() {
  const db = serviceClient();
  const [clients, projects, milestones] = await Promise.all([
    db.from('clients').select('*').order('name'),
    db.from('projects').select('id, name, slug, client_id'),
    db.from('milestones').select('amount, status, project_id'),
  ]);
  const projById = projects.data ?? [];
  return (clients.data ?? []).map((c: any) => {
    const cProjects = projById.filter((p: any) => p.client_id === c.id);
    const projIds = new Set(cProjects.map((p: any) => p.id));
    const owed = (milestones.data ?? [])
      .filter((m: any) => projIds.has(m.project_id) && m.status !== 'paid')
      .reduce((s: number, m: any) => s + Number(m.amount), 0);
    return { ...c, projects: cProjects, owed };
  });
}

export async function getAgentsView() {
  const db = serviceClient();
  const [agents, projects] = await Promise.all([
    db.from('agents').select('*').order('created_at', { ascending: false }),
    db.from('projects').select('id, name'),
  ]);
  const nameById = new Map((projects.data ?? []).map((p: any) => [p.id, p.name]));
  return (agents.data ?? []).map((a: any) => ({
    ...a,
    scopeNames: (a.project_scope ?? []).map((id: string) => nameById.get(id)).filter(Boolean),
  }));
}
