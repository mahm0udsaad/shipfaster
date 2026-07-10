import {
  getPendingApprovalCountData,
  getTodayDataModel,
  type ActorContext,
} from './db/repository';

/** The dashboard runs as the workspace owner. */
export const ownerContext: ActorContext = {
  agentId: null,
  actorType: 'human',
  role: 'owner',
  projectScope: [],
};

export async function getPendingApprovalCount(): Promise<number> {
  return getPendingApprovalCountData();
}

export type TodayData = Awaited<ReturnType<typeof getTodayData>>;

export async function getTodayData() {
  const model = await getTodayDataModel();
  const active = new Set(model.openTaskProjectIds);
  const stale = model.projects.filter((p: any) => !active.has(p.id)).slice(0, 3);

  return {
    approvals: model.approvals,
    due: model.due,
    blocked: model.blocked,
    stale,
  };
}
