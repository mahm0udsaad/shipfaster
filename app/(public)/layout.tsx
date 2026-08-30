import Link from 'next/link';

/**
 * The shell for pages a client can open from a link with no account.
 *
 * Deliberately not the dashboard layout: that one calls `requireSession()` before it renders
 * a pixel, so a page nested under it can never be public no matter what the middleware says.
 * It also draws a sidebar full of routes an anonymous visitor cannot reach.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[var(--color-base)]">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--color-line)] px-4 sm:px-6">
        <Link
          href="/content"
          className="font-[var(--font-display)] text-[15px] font-bold tracking-tight text-[var(--color-ink)]"
        >
          ship<span className="text-[var(--color-brand)]">faster</span>
        </Link>
        <span className="text-[13px] text-[var(--color-faint)]">/ content plan</span>
        <Link
          href="/login"
          className="ml-auto rounded-lg border border-[var(--color-line-2)] px-3 py-1.5 text-[13px] font-semibold text-[var(--color-ink-2)] hover:bg-[var(--color-surface-2)]"
        >
          Sign in
        </Link>
      </header>
      <main className="min-w-0 flex-1 overflow-auto px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
