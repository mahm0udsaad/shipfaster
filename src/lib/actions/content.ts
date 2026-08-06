'use server';

import { revalidatePath } from 'next/cache';
import { getDashboardContext } from '../auth/session';
import { CHANNELS, STATUSES } from '../content';
import {
  createContentPost,
  decodeContentImagePaths,
  deleteContentPost,
  encodeContentImagePaths,
  updateContentPost,
  uploadContentImage,
} from '../db/repository';

/**
 * Content-calendar writes from the dashboard (owner context).
 *
 * Everything the browser sends is treated as untrusted input: the fields below are
 * whitelisted one by one rather than spread into the patch, so a hand-crafted request cannot
 * set account_id, project_id-by-another-account, or created_by_agent_id.
 */

export type ContentDraft = {
  id?: string;
  title: string;
  body?: string;
  scheduledAt: string;             // ISO instant
  projectId?: string | null;
  channel?: string;
  status?: string;
  imageUrl?: string | null;        // pasted external link
  imagePath?: string | null;       // uploaded object, from uploadContentImageAction
  imagePaths?: string[];           // ordered uploaded objects for a carousel
};

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

function clean(draft: ContentDraft) {
  const title = draft.title?.trim();
  if (!title) throw new Error('A title is required');
  const at = new Date(draft.scheduledAt);
  if (Number.isNaN(at.getTime())) throw new Error('A valid date & time is required');
  const channel = CHANNELS.includes(draft.channel as never) ? draft.channel! : 'instagram';
  const status = STATUSES.includes(draft.status as never) ? draft.status! : 'scheduled';
  const url = draft.imageUrl?.trim() || null;
  // Only http(s) — a `javascript:`/`data:` URL would be rendered straight into an <img src>.
  if (url && !/^https?:\/\//i.test(url)) throw new Error('Image URL must start with http(s)://');
  const submittedPaths = Array.isArray(draft.imagePaths)
    ? draft.imagePaths.filter((path): path is string => typeof path === 'string' && path.length > 0)
    : decodeContentImagePaths(draft.imagePath);
  const imagePaths = [...new Set(submittedPaths)];
  return {
    title,
    body: draft.body?.trim() || null,
    scheduledAt: at.toISOString(),
    projectId: draft.projectId || null,
    channel,
    status,
    imageUrl: imagePaths.length > 0 ? null : url,
    imagePaths,
  };
}

function revalidate() {
  revalidatePath('/content');
  revalidatePath('/today');
}

export async function saveContentPostAction(draft: ContentDraft) {
  const ctx = await getDashboardContext();
  const v = clean(draft);

  if (draft.id) {
    await updateContentPost(ctx, draft.id, {
      title: v.title,
      body: v.body,
      scheduled_at: v.scheduledAt,
      project_id: v.projectId,
      channel: v.channel,
      status: v.status,
      image_url: v.imageUrl,
      image_path: encodeContentImagePaths(v.imagePaths),
    });
  } else {
    await createContentPost(ctx, v);
  }
  revalidate();
}

/** Drag-and-drop reschedule: the slot moves, nothing else does. */
export async function rescheduleContentPostAction(id: string, scheduledAtIso: string) {
  const at = new Date(scheduledAtIso);
  if (Number.isNaN(at.getTime())) throw new Error('A valid date & time is required');
  await updateContentPost(
    await getDashboardContext(),
    id,
    { scheduled_at: at.toISOString() },
    'rescheduled from the calendar',
  );
  revalidate();
}

export async function deleteContentPostAction(id: string) {
  await deleteContentPost(await getDashboardContext(), id);
  revalidate();
}

/**
 * Upload a creative and return its storage path (not a URL — the bucket is private and the
 * page signs paths at render time). Type and size are checked here rather than trusted from
 * the browser; the bucket enforces the same limits as a second line.
 */
export async function uploadContentImageAction(form: FormData): Promise<{ path: string }> {
  const file = form.get('file');
  if (!(file instanceof File)) throw new Error('No file received');
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Image must be PNG, JPEG, WebP or GIF');
  }
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Image must be under 10 MB');
  const path = await uploadContentImage(await getDashboardContext(), {
    name: file.name,
    type: file.type,
    bytes: await file.arrayBuffer(),
  });
  return { path };
}
