/**
 * The role vocabulary, with no server dependencies.
 *
 * Split from session.ts so the Sidebar (a client component) can ask what a role may see
 * without dragging the Supabase service client and next/headers into the browser bundle.
 * Anything here must stay pure.
 */

export type MemberRole = 'owner' | 'admin' | 'member' | 'media_buyer';

/** Roles that see the whole workspace. A media buyer is deliberately not among them. */
const FULL_ACCESS: MemberRole[] = ['owner', 'admin', 'member'];

export function hasFullAccess(role: MemberRole): boolean {
  return FULL_ACCESS.includes(role);
}

/** Where a role belongs when it arrives with no particular destination. */
export function landingFor(role: MemberRole): string {
  return hasFullAccess(role) ? '/today' : '/content';
}
