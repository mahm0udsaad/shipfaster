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

/**
 * Reject a key that cannot actually bypass RLS.
 *
 * This exists because SUPABASE_SERVICE_ROLE_KEY once held the *anon* key. With RLS off,
 * anon had unrestricted access to every table, so everything worked and the mislabelling
 * went unnoticed for months — while a key designed to be published had full read/write on
 * the whole database. The moment RLS came on it failed as silent empty reads ("no account
 * exists"), which is the worst possible symptom: it looks like missing data, not a
 * misconfiguration.
 *
 * A privileged key is either a legacy JWT with role=service_role, or an `sb_secret_…` key.
 * Anything else is a client-side key and must fail loudly here rather than degrade quietly.
 */
function assertPrivilegedKey(key: string): void {
  if (key.startsWith('sb_secret_')) return;
  if (key.startsWith('sb_publishable_')) {
    throw new Error(
      'SUPABASE_SECRET_KEY holds a PUBLISHABLE key. It cannot bypass RLS: every read will ' +
        'silently return zero rows. Use the sb_secret_… key (Settings → API Keys → Secret keys).',
    );
  }
  if (key.startsWith('eyJ')) {
    let role: string | undefined;
    try {
      role = JSON.parse(Buffer.from(key.split('.')[1]!, 'base64url').toString()).role;
    } catch {
      throw new Error('SUPABASE_SECRET_KEY is not a decodable Supabase key.');
    }
    if (role === 'service_role') return;
    throw new Error(
      `SUPABASE_SECRET_KEY holds a legacy key with role="${role}", not "service_role". ` +
        'It cannot bypass RLS: every read will silently return zero rows. Use the sb_secret_… ' +
        'key (Settings → API Keys → Secret keys).',
    );
  }
  throw new Error('SUPABASE_SECRET_KEY is not a recognised Supabase key format.');
}

export function serviceClient(): SupabaseClient {
  if (cachedService) return cachedService;
  // No fallback to the publishable key: that fallback is exactly what hid the anon-key
  // mislabelling. A missing privileged key must stop the process, not half-work.
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      'Set SUPABASE_SECRET_KEY to the project sb_secret_… key (Settings → API Keys → Secret keys).',
    );
  }
  assertPrivilegedKey(key);
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
