import {
  getPendingApprovalCountData,
  getTodayDataModel,
  resolveSoleAccountId,
  type ActorContext,
} from './db/repository';

/**
 * The workspace-owner context, for callers with NO HTTP REQUEST behind them: scripts,
 * verification harnesses, cron. It trusts whoever calls it, which is exactly why nothing
 * user-facing may use it.
 *
 * Dashboard pages and server actions must use getDashboardContext()/requireSession() from
 * src/lib/auth/session.ts instead — those derive the account from the signed-in user's
 * membership and carry that user's own token, so RLS binds as them. This function was the
 * dashboard's context before login existed (M7 phase 3, now shipped); leaving it on a page
 * would hand a media buyer an owner context.
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

export async function getPendingApprovalCount(ctx: ActorContext): Promise<number> {
  return getPendingApprovalCountData(ctx);
}

export type TodayData = Awaited<ReturnType<typeof getTodayData>>;

export async function getTodayData(ctx: ActorContext) {
  const model = await getTodayDataModel(ctx);
  const active = new Set(model.openTaskProjectIds);
  const stale = model.projects.filter((p: any) => !active.has(p.id)).slice(0, 3);

  return {
    approvals: model.approvals,
    due: model.due,
    blocked: model.blocked,
    stale,
  };
}
