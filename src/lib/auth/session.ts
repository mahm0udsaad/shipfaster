import { redirect } from 'next/navigation';
import { serviceClient } from '../db/client';
import type { ActorContext } from '../db/repository';
import { hasFullAccess, type MemberRole } from './roles';
import { authClient } from './supabase';

/**
 * Who is asking, for every dashboard request.
 *
 * This replaces getOwnerContext() on the HTTP path. The difference matters: getOwnerContext
 * resolved "the only account there is" and trusted whoever reached the page, which was
 * acceptable only while the dashboard had no login at all. Here the account comes from the
 * signed-in user's membership row, and the ActorContext carries that user's own access token
 * — so every query runs under RLS as them, and the database refuses what the role forbids
 * even if a page forgets to guard.
 */

export { hasFullAccess, landingFor, type MemberRole } from './roles';

export type Session = {
  userId: string;
  email: string | null;
  accountId: string;
  role: MemberRole;
  ctx: ActorContext;
};

/**
 * The signed-in session, or null. Never throws on "not signed in" — callers decide whether
 * that is a redirect or a 404.
 *
 * getUser() rather than getSession(): the latter returns whatever the cookie claims, without
 * asking Supabase whether the token is still valid. For an authorization decision that
 * difference is the whole point.
 */
export async function getSession(): Promise<Session | null> {
  const supabase = await authClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // SERVICE-ROLE BY NECESSITY: account_members' own policy is readable by members, but this
  // runs before we know which account the user belongs to, and a user with no membership
  // must be distinguishable from one whose read was filtered away. It reads ids and a role.
  const { data: membership, error: memberError } = await serviceClient()
    .from('account_members')
    .select('account_id, role')
    .eq('user_id', data.user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (memberError) throw memberError;
  if (!membership) return null;   // authenticated but belongs to no account — not a user here

  const role = membership.role as MemberRole;
  return {
    userId: data.user.id,
    email: data.user.email ?? null,
    accountId: membership.account_id,
    role,
    ctx: {
      agentId: null,
      accountId: membership.account_id,
      actorType: 'human',
      // ActorContext.role is the AGENT role vocabulary, consumed by MCP tool allow-lists.
      // Humans never reach that surface; 'owner' here means "not an agent", and the human's
      // real permissions travel as Session.role above.
      role: 'owner',
      projectScope: [],
      // Their own token, so RLS binds as this user rather than falling back to service-role.
      dbToken: session?.access_token,
    },
  };
}

/** The session, or bounce to the login page. Use in any page that requires a human. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect('/login');
  return session;
}

/**
 * As requireSession, and refuses roles that do not get the run of the workspace: a media
 * buyer asking for Money or Clients lands back on their calendar.
 *
 * This is the SECOND line, not the only one — migration 0008 makes the database refuse those
 * tables for this role, which is what protects the data if a page is ever added without this
 * call. Keep both.
 */
export async function requireFullAccess(): Promise<Session> {
  const session = await requireSession();
  if (!hasFullAccess(session.role)) redirect('/content');
  return session;
}

/** The ActorContext for the signed-in human — the dashboard's replacement for getOwnerContext(). */
export async function getDashboardContext(): Promise<ActorContext> {
  return (await requireSession()).ctx;
}
