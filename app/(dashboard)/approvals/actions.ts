'use server';

import { revalidatePath } from 'next/cache';
import { getOwnerContext } from '../../../src/lib/dashboard';
import { resolveApproval } from '../../../src/lib/db/repository';

export async function resolveApprovalAction(
  approvalId: string,
  decision: 'approve' | 'reject',
  note?: string,
) {
  const result = await resolveApproval(await getOwnerContext(), approvalId, decision, note);
  revalidatePath('/approvals');
  revalidatePath('/today');
  return result;
}
