import { createHash } from 'node:crypto';
import { serviceClient } from '../../lib/db/client';
import { canMintAgentTokens, mintAgentDbToken } from '../../lib/db/actor-token';
import { resolveSoleAccountId, type ActorContext } from '../../lib/db/repository';
import { forbidden } from './errors';

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/**
 * Mint the actor's database credential, if this deployment can.
 *
 * Returns undefined rather than throwing when SUPABASE_JWT_SECRET is absent: the repository
 * layer's account filter still isolates tenants on the service-role fallback, so a missing
 * secret must degrade (loudly) rather than take the whole MCP surface down. The warning is
 * the point — a deployment running without RLS should say so.
 */
function mintDbToken(claims: { accountId: string; agentId: string; role: string }): string | undefined {
  if (!canMintAgentTokens()) {
    if (!warnedNoJwtSecret) {
      warnedNoJwtSecret = true;
      console.warn(
        '[ship-faster] SUPABASE_JWT_SECRET unset — queries fall back to the service-role key, ' +
          'which BYPASSES RLS. Tenant isolation rests solely on the repository account filter.',
      );
    }
    return undefined;
  }
  return mintAgentDbToken(claims);
}
let warnedNoJwtSecret = false;

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
    const accountId = await resolveSoleAccountId();
    return {
      agentId: null,
      accountId,
      actorType: 'human',
      role: 'owner',
      projectScope: [],
      // The owner is not an agents row, but it is a real actor with an account, so it gets
      // the same scoped token: RLS should bind on the owner's queries too, not just agents'.
      dbToken: mintDbToken({ accountId, agentId: OWNER_SUBJECT, role: 'owner' }),
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
    dbToken: mintDbToken({ accountId: data.account_id, agentId: data.id, role: data.role }),
  };
}

/**
 * Subject claim for the OWNER_TOKEN, which has no agents row. A fixed nil UUID keeps the
 * JWT well-formed; policies must key off the account_id claim, never off `sub`.
 */
const OWNER_SUBJECT = '00000000-0000-0000-0000-000000000000';
