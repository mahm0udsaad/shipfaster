import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase clients. ONLY imported by the repository layer and server code —
 * never shipped to the browser.
 *
 * Two clients, and the difference is the whole security story:
 *
 *   serviceClient() — service-role key. BYPASSES RLS. Every query it runs is protected only
 *                     by the account filter in repository.ts.
 *   actorClient()   — a short-lived per-actor JWT. RLS applies, so the database refuses
 *                     cross-tenant rows even if the repository layer forgets to filter.
 *
 * The repository account filter and RLS are deliberately redundant: one is a code invariant,
 * the other a database one, and they fail independently.
 */
let cachedService: SupabaseClient | null = null;

function supabaseUrl(): string {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error('Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)');
  return url;
}

export function serviceClient(): SupabaseClient {
  if (cachedService) return cachedService;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error(
      'Set SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY for dev)',
    );
  }
  cachedService = createClient(supabaseUrl(), key, { auth: { persistSession: false } });
  return cachedService;
}

/**
 * A client bound to one actor's JWT. The publishable key travels as the `apikey` header
 * (it identifies the project, and grants nothing on its own); the JWT in `Authorization`
 * is what PostgREST resolves auth.jwt()/auth.uid() from, and therefore what RLS sees.
 *
 * Memoized per token so a single request that makes several queries reuses one client;
 * tokens are short-lived, so this map is bounded in practice by token TTL.
 */
const actorClients = new Map<string, SupabaseClient>();

export function actorClient(jwt: string): SupabaseClient {
  const cached = actorClients.get(jwt);
  if (cached) return cached;

  const apikey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!apikey) throw new Error('Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');

  const client = createClient(supabaseUrl(), apikey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });

  // Keep the map from growing without bound if something ever mints tokens in a loop.
  if (actorClients.size > 64) actorClients.clear();
  actorClients.set(jwt, client);
  return client;
}
