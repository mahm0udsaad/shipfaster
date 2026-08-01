/**
 * Content-calendar vocabulary, shared by the server actions and the client UI.
 *
 * It lives outside `actions/content.ts` because a 'use server' module may only export async
 * functions — a constant there is a build error, not a style preference.
 *
 * These lists mirror the `content_channel` / `content_status` enums in migration 0006. A
 * value missing here is silently coerced by the action layer; a value missing THERE is
 * rejected by Postgres. Keep the three in step.
 */

export const CHANNELS = [
  'instagram',
  'facebook',
  'tiktok',
  'x',
  'linkedin',
  'youtube',
  'email',
  'blog',
  'other',
] as const;

export const STATUSES = ['idea', 'draft', 'scheduled', 'published'] as const;

export type Channel = (typeof CHANNELS)[number];
export type ContentStatus = (typeof STATUSES)[number];

export const CHANNEL_LABEL: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  x: 'X',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  email: 'Email',
  blog: 'Blog',
  other: 'Other',
};

/** Status → the token driving the chip's accent. Kept as CSS vars so themes stay in charge. */
export const STATUS_COLOR: Record<string, string> = {
  idea: 'var(--color-faint)',
  draft: 'var(--color-pending)',
  scheduled: 'var(--color-agent-2)',
  published: 'var(--color-success)',
};

/** A post as the calendar renders it: DB row + the resolved (signed or external) image URL. */
export type CalendarPost = {
  id: string;
  title: string;
  body: string | null;
  imageSrc: string | null;
  imagePath: string | null;
  imageUrl: string | null;
  channel: string;
  status: string;
  scheduledAt: string;
  projectId: string | null;
  projectName: string | null;
};
