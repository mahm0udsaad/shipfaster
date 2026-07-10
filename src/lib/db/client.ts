import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client using the service-role key.
 * ONLY imported by the repository layer and server code — never shipped to the browser.
 * RLS is enforced as defense-in-depth (M7); the repository layer is the primary access control.
 */
let cached: SupabaseClient | null = null;

export function serviceClient(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Prefer the service-role key. In dev, fall back to the publishable/anon key — RLS is
  // currently disabled (see README security note), so the anon key has full access until
  // M7 adds policies. Set SUPABASE_SERVICE_ROLE_KEY for production.
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY for dev)',
    );
  }
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}
