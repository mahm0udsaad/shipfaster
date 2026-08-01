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
  listContentPosts,
  signContentImages,
  type ActorContext,
} from './db/repository';
import { assembleContextPack } from './context/pack';
import { monthFetchRange } from './calendar';
import type { CalendarPost } from './content';

/**
 * Dashboard read-views. Server-only aggregation over the live DB.
 *
 * Every view takes the caller's ActorContext rather than resolving one itself: the account
 * a page renders must come from who is asking, and passing it in means that when real auth
 * replaces getOwnerContext() only the page changes, not this layer.
 */

const OPEN = ['todo', 'in_progress', 'blocked', 'review'];

export async function getProjectsOverview(ctx: ActorContext) {
  const { projects, tasks, milestones, agents } = await getProjectsOverviewData(ctx);

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

export async function getProjectBySlug(ctx: ActorContext, slug: string) {
  return getProjectBySlugData(ctx, slug);
}

export async function getBoard(ctx: ActorContext, projectId: string) {
  const data = await getProjectBoardTasks(ctx, projectId);
  const cols: Record<string, any[]> = { todo: [], in_progress: [], blocked: [], review: [], done: [] };
  for (const t of data) {
    const col = cols[t.status];
    if (col) col.push(t);
  }
  return cols;
}

export async function getBrainView(ctx: ActorContext, projectId: string) {
  return getBrainViewData(ctx, projectId);
}

export async function getActivityView(ctx: ActorContext, projectId: string) {
  return getProjectActivityData(ctx, projectId);
}

export async function getTaskDetail(ctx: ActorContext, taskId: string) {
  const detail = await getTaskDetailData(ctx, taskId);
  if (!detail) return null;
  const { task, comments } = detail;
  const packData = await getContextPackData(ctx, task.project_id, taskId);
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

export async function getMoneyOverview(ctx: ActorContext) {
  const rows = await getMoneyOverviewData(ctx);
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

export async function getClientsView(ctx: ActorContext) {
  const { clients, projects, milestones } = await getClientsViewData(ctx);
  return clients.map((c: any) => {
    const cProjects = projects.filter((p: any) => p.client_id === c.id);
    const projIds = new Set(cProjects.map((p: any) => p.id));
    const owed = milestones
      .filter((m: any) => projIds.has(m.project_id) && m.status !== 'paid')
      .reduce((s: number, m: any) => s + Number(m.amount), 0);
    return { ...c, projects: cProjects, owed };
  });
}

/**
 * The content calendar for one month. Fetches a padded window (see monthFetchRange) and
 * resolves every creative to something an <img> can load — uploads via a short-lived signed
 * URL, pasted links as-is. Bucketing into day cells happens on the client, in the viewer's
 * timezone, so a late-evening slot never drifts a day.
 */
export async function getContentCalendar(
  ctx: ActorContext,
  month: { year: number; month: number },
  filter: { projectId?: string } = {},
): Promise<CalendarPost[]> {
  const range = monthFetchRange(month.year, month.month);
  const posts = await listContentPosts(ctx, range, filter);
  const signed = await signContentImages(posts);

  return posts.map((p) => ({
    id: p.id,
    title: p.title,
    body: p.body,
    imageSrc: p.image_path ? (signed.get(p.image_path) ?? null) : p.image_url,
    imagePath: p.image_path,
    imageUrl: p.image_url,
    channel: p.channel,
    status: p.status,
    scheduledAt: p.scheduled_at,
    projectId: p.project_id,
    projectName: p.projects?.name ?? null,
  }));
}

export async function getAgentsView(ctx: ActorContext) {
  const { agents, projects, taskTokens, sessionTokens } = await getAgentsViewData(ctx);
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
