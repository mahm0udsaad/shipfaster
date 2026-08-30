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
 *    /content is deliberately absent: it is the read-only content plan, served to a client
 *    from a link with no account. It renders `src/lib/content-plan.ts` and files under
 *    public/ — there is nothing behind it for a session to protect. Adding it back here means
 *    first moving it out of app/(public)/.
 */

const PROTECTED = [
  '/today',
  '/approvals',
  '/projects',
  '/clients',
  '/money',
  '/agents',
];

export async function middleware(request: NextRequest) {
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

  const path = request.nextUrl.pathname;
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
