import { createHmac } from 'node:crypto';

/**
 * Mints the database credential an agent connects with.
 *
 * WHY THIS EXISTS
 * Agents authenticate to ship-faster with their own bearer token (agents.token_hash) — they
 * are not Supabase Auth users, so they have no auth.uid() and RLS policies have nothing to
 * key off. Left alone, every agent request would run on the service-role key, which bypasses
 * RLS entirely: policies would exist but never bind on the MCP surface, which is precisely
 * where agents live. Minting a short-lived Supabase-compatible JWT per agent gives PostgREST
 * a real identity for that request, so `auth.jwt() ->> 'account_id'` resolves and the same
 * policies protect agents and humans alike.
 *
 * SIGNING METHOD IS DELIBERATELY ISOLATED HERE
 * This signs HS256 with the project's legacy JWT secret. Supabase is migrating projects to
 * asymmetric signing keys, after which self-signed HS256 tokens stop verifying. When that
 * happens only this file changes — callers just ask for a token. Keep it that way.
 */

/** Minutes a minted agent token stays valid. Short: a revoked agent must lose access fast. */
const TTL_SECONDS = 5 * 60;

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export class MissingJwtSecretError extends Error {
  constructor() {
    super(
      'SUPABASE_JWT_SECRET is not set — cannot mint a per-agent database token. ' +
        'Supabase dashboard → Project Settings → API → JWT Settings → JWT Secret.',
    );
    this.name = 'MissingJwtSecretError';
  }
}

export type AgentTokenClaims = {
  accountId: string;
  agentId: string;
  role: string;
};

/**
 * Sign a short-lived JWT carrying the agent's account.
 *
 * `role: 'authenticated'` is the Postgres role PostgREST switches into — NOT the agent's
 * ship-faster role. Naming them the same thing would invite a policy author to think
 * `auth.role()` says something about agent permissions; it does not. The ship-faster role
 * travels as a separate `agent_role` claim.
 */
export function mintAgentDbToken(claims: AgentTokenClaims, nowMs = Date.now()): string {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) throw new MissingJwtSecretError();

  const iat = Math.floor(nowMs / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    // PostgREST switches into this Postgres role. Never 'service_role' — that bypasses RLS,
    // which would defeat the entire point of minting a scoped token.
    role: 'authenticated',
    // `sub` is conventionally the user id; agents have no auth.users row, so this is the
    // agent id. Policies must NOT join account_members on it — see the account_id claim.
    sub: claims.agentId,
    aud: 'authenticated',
    account_id: claims.accountId,
    agent_id: claims.agentId,
    agent_role: claims.role,
    iat,
    exp: iat + TTL_SECONDS,
  };

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = base64url(createHmac('sha256', secret).update(signingInput).digest());
  return `${signingInput}.${signature}`;
}

/** True when the deployment is able to mint per-agent tokens at all. */
export function canMintAgentTokens(): boolean {
  return Boolean(process.env.SUPABASE_JWT_SECRET);
}
