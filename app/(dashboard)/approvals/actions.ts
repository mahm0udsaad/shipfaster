'use server';

import { revalidatePath } from 'next/cache';
import { ownerContext } from '../../../src/lib/dashboard';
import { resolveApproval } from '../../../src/lib/db/repository';

export async function resolveApprovalAction(
  approvalId: string,
  decision: 'approve' | 'reject',
  note?: string,
) {
  const result = await resolveApproval(ownerContext, approvalId, decision, note);
  revalidatePath('/approvals');
  revalidatePath('/today');
  return result;
}
