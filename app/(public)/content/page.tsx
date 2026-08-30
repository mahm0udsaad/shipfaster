import Link from 'next/link';
import { monthKey, parseMonthKey, shiftMonth } from '../../../src/lib/calendar';
import {
  CONTENT_PLAN,
  PLAN_DEFAULT_MONTH,
  PLAN_PROJECT,
  planScheduledAt,
} from '../../../src/lib/content-plan';
import { PlanCalendar } from './plan-client';

/**
 * The content plan, readable by anyone with the link.
 *
 * No session, no database: the plan is a module in the repo (`src/lib/content-plan.ts`) and
 * the images sit in `public/kinbo/`. That is the whole point of this version — the client
 * reviews the plan without an account. The DB-backed editable calendar this replaced is in
 * git history at `app/(dashboard)/content/calendar-client.tsx`.
 */

/**
 * Rendered per request, and deliberately NOT `force-static`: that mode hands every request
 * an empty `searchParams`, so `?m=` would be silently ignored and the month arrows would do
 * nothing. The month belongs in the URL (shareable, back-button-able) as it always has, and
 * a render that reads a module constant costs nothing worth optimising away.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'KINBO — content plan',
  description: 'The scheduled posts, captions and creative for KINBO Store.',
};

export default async function ContentPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const params = await searchParams;
  // The plan's own month, not today's: a visitor landing in a month with no posts would see
  // an empty grid and assume the page is broken.
  const { year, month } = parseMonthKey(params.m ?? PLAN_DEFAULT_MONTH);

  const posts = CONTENT_PLAN.map((post) => ({
    ...post,
    scheduledAt: planScheduledAt(post),
  }));

  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const label = new Date(year, month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
  const qs = (m: string) => `/content?m=${m}`;

  const scheduled = posts.filter((p) => p.status === 'scheduled').length;
  const slides = posts.reduce((n, p) => n + p.slides.length, 0);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[var(--font-display)] text-2xl font-bold text-[var(--color-ink)]">
            {PLAN_PROJECT} — content plan
          </h1>
          <p className="text-[13px] text-[var(--color-muted)]">
            {posts.length} posts · {scheduled} scheduled · {slides} slides · click a post to read
            the caption
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-1">
            <Link
              href={qs(monthKey(prev.year, prev.month))}
              aria-label="Previous month"
              className="grid size-7 place-items-center rounded-md text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
            >
              ‹
            </Link>
            <span className="min-w-36 text-center text-[13px] font-semibold text-[var(--color-ink)]">
              {label}
            </span>
            <Link
              href={qs(monthKey(next.year, next.month))}
              aria-label="Next month"
              className="grid size-7 place-items-center rounded-md text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
            >
              ›
            </Link>
          </div>
          <Link
            href={qs(PLAN_DEFAULT_MONTH)}
            className="rounded-lg border border-[var(--color-line-2)] px-3 py-1.5 text-[13px] font-semibold text-[var(--color-ink-2)] hover:bg-[var(--color-surface-2)]"
          >
            Plan month
          </Link>
        </div>
      </div>

      <PlanCalendar year={year} month={month} posts={posts} />
    </div>
  );
}
