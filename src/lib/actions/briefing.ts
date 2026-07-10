'use server';

import { buildAgentBriefing } from '../agent-briefing';

/** Fetch the pasteable onboarding brief for a project (called when the modal opens). */
export async function getAgentBriefingAction(projectId: string): Promise<string> {
  return buildAgentBriefing(projectId);
}
