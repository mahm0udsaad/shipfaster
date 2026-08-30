import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Two jobs, in this order:
 *
 * 1. REFRESH. Supabase access tokens are short-lived. Server Components cannot write cookies,
 *    so without a middleware pass the rotated token has nowhere to land and a signed-in user
 *    silently falls out of their session mid-visit. This is why the client below is built by
 *    hand rather than reusing authClient() — it needs the response object to write onto.
 *
 * 2. GATE. Anything under the dashboard requires a signed-in user; unauthenticated requests
 *    go to /login. This is a coarse check by design — it asks "is anyone there", not "may
 *    this person see this page". Role enforcement lives where it can be reasoned about: the
 *    per-page requireFullAccess() guard, and the RLS policies in migration 0008.
 *
 *    /content is absent from PROTECTED *and* skipped by REFRESH via the PUBLIC list below —
 *    see that list's comment for why the REFRESH exemption matters on its own. It is the
 *    read-only content plan, served to a client from a link with no account: it renders
 *    `src/lib/content-plan.ts` and files under public/, so there is nothing behind it for a
 *    session to protect. Restoring auth on it means first moving it out of app/(public)/.
 */

const PROTECTED = [
  '/today',
  '/approvals',
  '/projects',
  '/clients',
  '/money',
  '/agents',
];

/**
 * Paths the REFRESH job must not touch, not just paths the GATE lets through.
 *
 * Before this list existed, /content fell through the GATE (correctly — it's not in
 * PROTECTED) but still paid the REFRESH cost: a `supabase.auth.getUser()` round-trip on
 * every request. That's a network call to Supabase carrying whatever auth cookie the browser
 * has — and for a visitor with a stale/expired session cookie (e.g. someone who used to have
 * a dashboard login), revalidating it can hang. Edge middleware has a hard invocation
 * timeout, so a hung revalidation surfaces to the visitor as a 504
 * MIDDLEWARE_INVOCATION_TIMEOUT — on a page that needs no session at all. Returning before
 * the Supabase client is even constructed removes the dependency, not just the symptom.
 */
const PUBLIC = ['/content'];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (PUBLIC.some((p) => path === p || path.startsWith(`${p}/`))) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });

  // getUser() and not getSession(): it revalidates the token with Supabase, which is also
  // what triggers the refresh this middleware exists to persist.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const needsAuth = PROTECTED.some((p) => path === p || path.startsWith(`${p}/`));

  if (!user && needsAuth) {
    const to = request.nextUrl.clone();
    to.pathname = '/login';
    // Where they were headed, so the login can return them there. Same-origin path only —
    // never a full URL from the request, which would make this an open redirect.
    to.search = `next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(to);
  }

  return response;
}

export const config = {
  // Everything except Next internals and static assets. Keeping images out matters: this
  // runs an auth round-trip per request.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
