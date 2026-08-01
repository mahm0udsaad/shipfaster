/**
 * Create a dashboard login and attach it to the workspace.
 *
 * Two writes that must both happen: a Supabase Auth user (so there is something to sign in
 * as) and an account_members row (so RLS can resolve which account they belong to and at
 * what role). A user with only the first is authenticated but a member of nothing — the
 * login refuses that state deliberately rather than showing an empty dashboard.
 *
 * THE PASSWORD IS NEVER AN ARGUMENT. It comes from the environment, so it does not land in
 * shell history, the process table, or this repository. Rotate anything you type at a prompt.
 *
 * Run:
 *   NEW_USER_PASSWORD='…' node --env-file=.env.local --import tsx/esm \
 *     scripts/provision-user.ts <email> <owner|admin|member|media_buyer>
 */
import { serviceClient } from '../src/lib/db/client';
import { resolveSoleAccountId } from '../src/lib/db/repository';

const ROLES = ['owner', 'admin', 'member', 'media_buyer'] as const;

const email = process.argv[2];
const role = process.argv[3] as (typeof ROLES)[number];
const password = process.env.NEW_USER_PASSWORD;

if (!email || !role) {
  console.error('usage: provision-user.ts <email> <owner|admin|member|media_buyer>');
  process.exit(1);
}
if (!ROLES.includes(role)) {
  console.error(`role must be one of: ${ROLES.join(', ')}`);
  process.exit(1);
}
if (!password) {
  console.error('Set NEW_USER_PASSWORD in the environment (not as an argument).');
  process.exit(1);
}

const admin = serviceClient();
const accountId = process.env.OWNER_ACCOUNT_ID ?? (await resolveSoleAccountId());

// Idempotent: re-running with a new password resets it rather than failing on a duplicate.
const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
const found = existing?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

let userId: string;
if (found) {
  const { data, error } = await admin.auth.admin.updateUserById(found.id, { password });
  if (error) throw error;
  userId = data.user.id;
  console.log(`↻ existing auth user, password reset — ${email}`);
} else {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    // No SMTP is configured on this project, so a confirmation mail would never arrive and
    // the account could never be used. The owner is vouching for the address by running this.
    email_confirm: true,
  });
  if (error) throw error;
  userId = data.user.id;
  console.log(`✅ auth user created — ${email}`);
}

const { error: memberError } = await admin
  .from('account_members')
  .upsert({ account_id: accountId, user_id: userId, role }, { onConflict: 'account_id,user_id' });
if (memberError) throw memberError;

console.log(`✅ membership — role=${role} account=${accountId}`);
console.log(`   lands on ${role === 'media_buyer' ? '/content' : '/today'} after sign-in`);
