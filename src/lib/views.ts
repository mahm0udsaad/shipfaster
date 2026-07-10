import {
  getAgentsViewData,
  getBrainViewData,
  getClientsViewData,
  getContextPackData,
  getMoneyOverviewData,
  getProjectActivityData,
  getProjectBoardTasks,
  getProjectBySlug as getProjectBySlugData,
  getProjectsOverviewData,
  getTaskDetailData,
} from './db/repository';
import { assembleContextPack } from './context/pack';

/** Dashboard read-views. Server-only aggregation over the live DB. */

const OPEN = ['todo', 'in_progress', 'blocked', 'review'];

export async function getProjectsOverview() {
  const { projects, tasks, milestones, agents } = await getProjectsOverviewData();

  return projects.map((p: any) => {
    const pTasks = tasks.filter((t: any) => t.project_id === p.id);
    const open = pTasks.filter((t: any) => OPEN.includes(t.status)).length;
    const pMs = milestones.filter((m: any) => m.project_id === p.id);
    const next = pMs.find((m: any) => m.status !== 'paid');
    const owed = pMs.filter((m: any) => m.status !== 'paid').reduce((s: number, m: any) => s + Number(m.amount), 0);
    const agentActive = agents.some(
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
  return getProjectBySlugData(slug);
}

export async function getBoard(projectId: string) {
  const data = await getProjectBoardTasks(projectId);
  const cols: Record<string, any[]> = { todo: [], in_progress: [], blocked: [], review: [], done: [] };
  for (const t of data) {
    const col = cols[t.status];
    if (col) col.push(t);
  }
  return cols;
}

export async function getBrainView(projectId: string) {
  return getBrainViewData(projectId);
}

export async function getActivityView(projectId: string) {
  return getProjectActivityData(projectId);
}

export async function getTaskDetail(taskId: string) {
  const detail = await getTaskDetailData(taskId);
  if (!detail) return null;
  const { task, comments } = detail;
  const packData = await getContextPackData(task.project_id, taskId);
  const pack = assembleContextPack({
    projectName: packData.projectName,
    focusedTask: packData.focusedTask,
    brain: packData.brain,
    relatedTasks: packData.relatedTasks,
    recentActivity: packData.recentActivity,
    tokenBudget: 4000,
  });
  return { task, comments, pack };
}

export async function getMoneyOverview() {
  const rows = await getMoneyOverviewData();
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
  const { clients, projects, milestones } = await getClientsViewData();
  return clients.map((c: any) => {
    const cProjects = projects.filter((p: any) => p.client_id === c.id);
    const projIds = new Set(cProjects.map((p: any) => p.id));
    const owed = milestones
      .filter((m: any) => projIds.has(m.project_id) && m.status !== 'paid')
      .reduce((s: number, m: any) => s + Number(m.amount), 0);
    return { ...c, projects: cProjects, owed };
  });
}

export async function getAgentsView() {
  const { agents, projects, taskTokens, sessionTokens } = await getAgentsViewData();
  const nameById = new Map(projects.map((p: any) => [p.id, p.name]));

  const tokensByAgent = new Map<string, number>();
  for (const t of taskTokens) {
    if (!t.created_by_agent_id) continue;
    tokensByAgent.set(t.created_by_agent_id, (tokensByAgent.get(t.created_by_agent_id) ?? 0) + Number(t.tokens_spent));
  }
  for (const s of sessionTokens) {
    if (!s.agent_id) continue;
    tokensByAgent.set(s.agent_id, (tokensByAgent.get(s.agent_id) ?? 0) + Number(s.tokens_spent));
  }

  return agents.map((a: any) => ({
    ...a,
    scopeNames: (a.project_scope ?? []).map((id: string) => nameById.get(id)).filter(Boolean),
    tokensSpent: tokensByAgent.get(a.id) ?? 0,
  }));
}
