'use server';

import { revalidatePath } from 'next/cache';
import { requireFullAccess } from '../auth/session';
import { updateTask } from '../db/repository';

/**
 * Human task-status changes from the dashboard (owner context).
 * "Mark Done" is deliberately human-only — Workers can only set `review` (Section 19).
 * Lives in src/lib (not a route folder) so it imports cleanly into client components.
 */
export async function setTaskStatusAction(
  taskId: string,
  status: 'done' | 'todo' | 'in_progress',
  slug: string,
  reason?: string,
) {
  await updateTask(
    (await requireFullAccess()).ctx,
    taskId,
    { status, updated_at: new Date().toISOString(), human_touched_at: new Date().toISOString() },
    reason ?? (status === 'done' ? 'closed by owner' : 'reopened by owner'),
  );
  revalidatePath(`/projects/${slug}`);
  revalidatePath('/today');
  revalidatePath('/projects');
}
