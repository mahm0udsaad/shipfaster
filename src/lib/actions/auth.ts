'use server';

import { redirect } from 'next/navigation';
import { authClient } from '../auth/supabase';
import { getSession, landingFor } from '../auth/session';

/**
 * Sign-in / sign-out.
 *
 * Passwords are handed straight to Supabase Auth and never touched again: not logged, not
 * stored, not echoed back in an error. The failure message is deliberately the same for a
 * wrong password and an unknown address — telling them apart is a free account-enumeration
 * oracle for anyone who finds this login.
 */

export async function signInAction(
  _prev: { error: string } | null,
  form: FormData,
): Promise<{ error: string } | null> {
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  if (!email || !password) return { error: 'Email and password are required.' };

  const supabase = await authClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: 'Wrong email or password.' };

  const session = await getSession();
  if (!session) {
    // Authenticated against Supabase, but no membership row — a real user of some other
    // workspace, or a half-finished provisioning. Do not leave them in a signed-in limbo.
    await supabase.auth.signOut();
    return { error: 'This account is not a member of any workspace.' };
  }
  redirect(landingFor(session.role));
}

export async function signOutAction() {
  const supabase = await authClient();
  await supabase.auth.signOut();
  redirect('/login');
}
