import {
  getPendingApprovalCountData,
  getTodayDataModel,
  resolveSoleAccountId,
  type ActorContext,
} from './db/repository';

/**
 * The dashboard runs as the workspace owner.
 *
 * TODO(M7 phase 3): the account must come from the signed-in user's session
 * (account_members → auth.uid()), not from "the only account there is". Until auth
 * lands, resolveSoleAccountId() throws rather than guess once a second account exists.
 */
export async function getOwnerContext(): Promise<ActorContext> {
  return {
    agentId: null,
    accountId: await resolveSoleAccountId(),
    actorType: 'human',
    role: 'owner',
    projectScope: [],
  };
}

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
