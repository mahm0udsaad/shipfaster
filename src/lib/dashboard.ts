import { serviceClient } from './db/client';
import type { ActorContext } from './db/repository';

/** The dashboard runs as the workspace owner. */
export const ownerContext: ActorContext = {
  agentId: null,
  actorType: 'human',
  role: 'owner',
  projectScope: [],
};

export async function getPendingApprovalCount(): Promise<number> {
  const { count } = await serviceClient()
    .from('approvals')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'open');
  return count ?? 0;
}

export type TodayData = Awaited<ReturnType<typeof getTodayData>>;

export async function getTodayData() {
  const db = serviceClient();

  const [approvals, due, blocked, projects] = await Promise.all([
    db
      .from('approvals')
      .select('id, kind, title, status, requested_by_agent_id, project_id, agents(name), projects(name)')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(5),
    db
      .from('tasks')
      .select('id, title, status, due_at, project_id, projects(name)')
      .not('status', 'in', '(done,cancelled)')
      .not('due_at', 'is', null)
      .lte('due_at', new Date(Date.now() + 3 * 864e5).toISOString())
      .order('due_at', { ascending: true })
      .limit(8),
    db
      .from('tasks')
      .select('id, title, status, project_id, assignee_agent_id, agents(name), projects(name)')
      .eq('status', 'blocked')
      .limit(8),
    db.from('projects').select('id, name, slug'),
  ]);

  // stale = projects with no open tasks (proxy until the activity feed fills in)
  const withTasks = await db.from('tasks').select('project_id').not('status', 'in', '(done,cancelled)');
  const active = new Set((withTasks.data ?? []).map((t: any) => t.project_id));
  const stale = (projects.data ?? []).filter((p: any) => !active.has(p.id)).slice(0, 3);

  return {
    approvals: approvals.data ?? [],
    due: due.data ?? [],
    blocked: blocked.data ?? [],
    stale,
  };
}
