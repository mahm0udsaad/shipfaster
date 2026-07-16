import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { mintAgentDbToken, canMintAgentTokens, MissingJwtSecretError } from '../../src/lib/db/actor-token';

/**
 * The minted token is what PostgREST checks before RLS runs. If the signature or claim
 * shape is wrong, every agent query fails closed (noisy) — but if `role` were wrong in the
 * other direction (service_role), every query would silently bypass RLS instead. That
 * asymmetry is why the role claim is asserted explicitly below.
 */

const SECRET = 'test-jwt-secret-not-a-real-one';
const ACCOUNT = 'aaaaaaaa-0000-0000-0000-000000000000';
const AGENT = 'bbbbbbbb-0000-0000-0000-000000000000';

/** Decode + verify independently of the signing code, so a bug can't validate itself. */
function verify(token: string, secret: string) {
  const [h, p, sig] = token.split('.');
  expect(h && p && sig).toBeTruthy();
  const expected = createHmac('sha256', secret)
    .update(`${h}.${p}`)
    .digest();
  const actual = Buffer.from(sig!, 'base64url');
  expect(actual.length).toBe(expected.length);
  expect(timingSafeEqual(actual, expected)).toBe(true);
  return {
    header: JSON.parse(Buffer.from(h!, 'base64url').toString()),
    payload: JSON.parse(Buffer.from(p!, 'base64url').toString()),
  };
}

beforeEach(() => {
  process.env.SUPABASE_JWT_SECRET = SECRET;
});
afterEach(() => {
  delete process.env.SUPABASE_JWT_SECRET;
});

describe('agent database token', () => {
  it('is a well-formed HS256 JWT that verifies against the secret', () => {
    const token = mintAgentDbToken({ accountId: ACCOUNT, agentId: AGENT, role: 'worker' });
    const { header } = verify(token, SECRET);
    expect(header).toEqual({ alg: 'HS256', typ: 'JWT' });
  });

  it('does not verify against a different secret', () => {
    const token = mintAgentDbToken({ accountId: ACCOUNT, agentId: AGENT, role: 'worker' });
    expect(() => verify(token, 'some-other-secret')).toThrow();
  });

  it('carries the account as a claim RLS can read', () => {
    const token = mintAgentDbToken({ accountId: ACCOUNT, agentId: AGENT, role: 'worker' });
    const { payload } = verify(token, SECRET);
    expect(payload.account_id).toBe(ACCOUNT);
    expect(payload.agent_id).toBe(AGENT);
  });

  it('never mints a service_role token — that would bypass the policies entirely', () => {
    for (const role of ['owner', 'worker', 'project_lead', 'brain_sync']) {
      const { payload } = verify(
        mintAgentDbToken({ accountId: ACCOUNT, agentId: AGENT, role }),
        SECRET,
      );
      expect(payload.role).toBe('authenticated');
      // The ship-faster role must not be conflated with the Postgres role.
      expect(payload.agent_role).toBe(role);
    }
  });

  it('expires, so a revoked agent loses database access without a restart', () => {
    const now = 1_800_000_000_000;
    const { payload } = verify(
      mintAgentDbToken({ accountId: ACCOUNT, agentId: AGENT, role: 'worker' }, now),
      SECRET,
    );
    expect(payload.iat).toBe(Math.floor(now / 1000));
    expect(payload.exp).toBeGreaterThan(payload.iat);
    // Short enough that revocation bites quickly.
    expect(payload.exp - payload.iat).toBeLessThanOrEqual(15 * 60);
  });

  it('fails loudly rather than silently falling back when the secret is absent', () => {
    delete process.env.SUPABASE_JWT_SECRET;
    expect(canMintAgentTokens()).toBe(false);
    expect(() => mintAgentDbToken({ accountId: ACCOUNT, agentId: AGENT, role: 'worker' })).toThrow(
      MissingJwtSecretError,
    );
  });
});
