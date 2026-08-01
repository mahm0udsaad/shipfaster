'use server';

import { revalidatePath } from 'next/cache';
import { requireFullAccess } from '../../../src/lib/auth/session';
import { resolveApproval } from '../../../src/lib/db/repository';

export async function resolveApprovalAction(
  approvalId: string,
  decision: 'approve' | 'reject',
  note?: string,
) {
  const result = await resolveApproval((await requireFullAccess()).ctx, approvalId, decision, note);
  revalidatePath('/approvals');
  revalidatePath('/today');
  return result;
}
