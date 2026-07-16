/**
 * Proves RLS actually BINDS — as opposed to merely being enabled.
 *
 * Why this script exists: "the app still works after enabling RLS" proves nothing. A token
 * that PostgREST silently rejected, or a code path that quietly fell back to the secret key,
 * both look exactly like success. The only convincing evidence is a query that SHOULD be
 * refused and IS.
 *
 * So each check below deliberately bypasses the repository layer and talks to PostgREST
 * directly. The repository's own account filter would mask the result otherwise — we are
 * testing the database, not the code.
 *
 * Run: node --env-file=.env.local --import tsx/esm scripts/verify-rls.ts
 */
import { createClient } from '@supabase/supabase-js';
import { mintAgentDbToken } from '../src/lib/db/actor-token';
import { serviceClient } from '../src/lib/db/client';

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

const BOGUS_ACCOUNT = '00000000-dead-4000-8000-000000000000';
const AGENT = '11111111-2222-4333-8444-555555555555';

function clientWithToken(jwt: string) {
  return createClient(url, publishable, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
}

const results: { name: string; pass: boolean; detail: string }[] = [];
function check(name: string, pass: boolean, detail: string) {
  results.push({ name, pass, detail });
  console.log(`${pass ? '  PASS' : '  FAIL'}  ${name}\n        ${detail}`);
}

async function main() {
  // Ground truth, via the privileged key (bypasses RLS by design).
  const svc = serviceClient();
  const { data: accounts } = await svc.from('accounts').select('id');
  const { data: allProjects } = await svc.from('projects').select('id, account_id');
  const realAccount = accounts![0]!.id;
  const total = allProjects!.length;
  console.log(`\nGround truth (privileged key): ${accounts!.length} account(s), ${total} project(s)\n`);

  // 1. A token for the REAL account must see that account's projects. If this returns 0,
  //    the token is being rejected and the app only "works" via a service-role fallback.
  const realToken = mintAgentDbToken({ accountId: realAccount, agentId: AGENT, role: 'owner' });
  const { data: realRows, error: realErr } = await clientWithToken(realToken)
    .from('projects')
    .select('id');
  check(
    'a token carrying the real account_id can read that account',
    !realErr && (realRows?.length ?? 0) === total,
    realErr ? `error: ${realErr.message}` : `saw ${realRows?.length ?? 0}/${total} projects`,
  );

  // 2. THE decisive one. Same code path, same table, no repository filter — only the
  //    account_id claim differs. If this returns rows, RLS is not binding at all.
  const bogusToken = mintAgentDbToken({ accountId: BOGUS_ACCOUNT, agentId: AGENT, role: 'owner' });
  const { data: bogusRows, error: bogusErr } = await clientWithToken(bogusToken)
    .from('projects')
    .select('id');
  check(
    "a token for a DIFFERENT account sees nothing (the database refuses it, not our code)",
    !bogusErr && (bogusRows?.length ?? 0) === 0,
    bogusErr ? `error: ${bogusErr.message}` : `saw ${bogusRows?.length ?? 0} projects (want 0)`,
  );

  // 3. A forged token must not be accepted at all. Same claims, wrong signature.
  const forged = mintAgentDbToken({ accountId: realAccount, agentId: AGENT, role: 'owner' })
    .split('.')
    .slice(0, 2)
    .concat('Zm9yZ2VkLXNpZ25hdHVyZQ')
    .join('.');
  const { data: forgedRows, error: forgedErr } = await clientWithToken(forged)
    .from('projects')
    .select('id');
  check(
    'a token with a bad signature is rejected',
    Boolean(forgedErr) || (forgedRows?.length ?? 0) === 0,
    forgedErr ? `rejected: ${forgedErr.message}` : `saw ${forgedRows?.length ?? 0} rows (want 0/err)`,
  );

  // 4. The publishable key alone — the one that ships to browsers — must read nothing.
  //    This is the claim the README makes; it was FALSE before RLS existed.
  const anonClient = createClient(url, publishable, { auth: { persistSession: false } });
  const { data: anonRows, error: anonErr } = await anonClient.from('projects').select('id');
  check(
    'the publishable key alone reads nothing (safe to ship to a browser)',
    !!anonErr || (anonRows?.length ?? 0) === 0,
    anonErr ? `refused: ${anonErr.message}` : `saw ${anonRows?.length ?? 0} projects (want 0)`,
  );

  // 5. Writes must be refused too — USING covers reads, WITH CHECK covers inserts.
  const { error: writeErr } = await clientWithToken(bogusToken)
    .from('projects')
    .insert({ account_id: realAccount, name: 'rls-probe', slug: 'rls-probe-' + Date.now() });
  check(
    'a cross-account INSERT is refused by WITH CHECK',
    Boolean(writeErr),
    writeErr ? `refused: ${writeErr.message}` : 'INSERT SUCCEEDED — policy hole!',
  );

  const failed = results.filter((r) => !r.pass);
  console.log(
    `\n${results.length - failed.length}/${results.length} checks passed` +
      (failed.length ? ` — FAILED: ${failed.map((f) => f.name).join('; ')}` : ''),
  );
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error('verify-rls crashed:', e);
  process.exit(1);
});
