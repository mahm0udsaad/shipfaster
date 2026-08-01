import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * The Supabase client that carries a HUMAN's session.
 *
 * Distinct from src/lib/db/client.ts on purpose. Those two clients are for machines: the
 * service-role key (bypasses RLS) and a minted per-agent JWT. This one holds a real Supabase
 * Auth session in cookies, so `auth.uid()` resolves and the account_members half of every
 * policy finally has something to match.
 *
 * The publishable key is correct here and grants nothing on its own — with RLS denying by
 * default for `anon`, the session cookie is the entire authorization story.
 */
export async function authClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url) throw new Error('Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)');
  if (!key) throw new Error('Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');

  const store = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Server Components may not write cookies. Harmless: middleware refreshes the
          // session on every request, so the rotated token still gets persisted there.
        }
      },
    },
  });
}
