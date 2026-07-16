import { createHash } from 'node:crypto';
import { serviceClient } from '../../lib/db/client';
import { resolveSoleAccountId, type ActorContext } from '../../lib/db/repository';
import { forbidden } from './errors';

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/**
 * Resolve a bearer token to an ActorContext.
 * - OWNER_TOKEN (env) → full-access human owner.
 * - otherwise → an `agents` row keyed by token_hash, unless revoked.
 */
export async function authenticate(rawToken: string | undefined): Promise<ActorContext> {
  if (!rawToken) throw forbidden('missing bearer token');

  // The OWNER_TOKEN predates accounts and carries none of its own, so its account is
  // resolved the same way the dashboard's is (OWNER_ACCOUNT_ID, else the sole account).
  if (process.env.OWNER_TOKEN && rawToken === process.env.OWNER_TOKEN) {
    return {
      agentId: null,
      accountId: await resolveSoleAccountId(),
      actorType: 'human',
      role: 'owner',
      projectScope: [],
    };
  }

  const { data, error } = await serviceClient()
    .from('agents')
    .select('*')
    .eq('token_hash', hashToken(rawToken))
    .maybeSingle();

  if (error) throw error;
  if (!data || data.revoked_at) throw forbidden('unknown or revoked token');

  // fire-and-forget last_active_at bump
  void serviceClient().from('agents').update({ last_active_at: new Date().toISOString() }).eq('id', data.id);

  return {
    agentId: data.id,
    accountId: data.account_id,
    actorType: 'agent',
    role: data.role,
    projectScope: data.project_scope ?? [],
  };
}
