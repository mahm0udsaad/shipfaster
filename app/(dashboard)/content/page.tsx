import Link from 'next/link';
import { requireSession } from '../../../src/lib/auth/session';
import { getContentCalendar } from '../../../src/lib/views';
import { listProjects } from '../../../src/lib/db/repository';
import { monthKey, parseMonthKey, shiftMonth } from '../../../src/lib/calendar';
import { ContentCalendar } from './calendar-client';

export const dynamic = 'force-dynamic';

/**
 * The month lives in the URL (?m=YYYY-MM), not in client state: paging months is a server
 * fetch (a different window of posts), and a shareable/back-button-able URL is free.
 */
export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; project?: string }>;
}) {
  const params = await searchParams;
  // requireSession, not requireFullAccess: this is the one page a media buyer may open.
  const ctx = (await requireSession()).ctx;
  const { year, month } = parseMonthKey(params.m);
  const projectId = params.project || undefined;

  const [posts, projects] = await Promise.all([
    getContentCalendar(ctx, { year, month }, { projectId }),
    listProjects(ctx),
  ]);

  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const label = new Date(year, month, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
  const qs = (m: string, p?: string) => `/content?m=${m}${p ? `&project=${p}` : ''}`;

  const scheduled = posts.filter((p) => p.status === 'scheduled').length;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[var(--font-display)] text-2xl font-bold text-[var(--color-ink)]">
            Content calendar
          </h1>
          <p className="text-[13px] text-[var(--color-muted)]">
            {posts.length} posts in view · {scheduled} scheduled · drag a post to move it
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-1">
            <Link
              href={qs(monthKey(prev.year, prev.month), projectId)}
              aria-label="Previous month"
              className="grid size-7 place-items-center rounded-md text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
            >
              ‹
            </Link>
            <span className="min-w-36 text-center text-[13px] font-semibold text-[var(--color-ink)]">
              {label}
            </span>
            <Link
              href={qs(monthKey(next.year, next.month), projectId)}
              aria-label="Next month"
              className="grid size-7 place-items-center rounded-md text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
            >
              ›
            </Link>
          </div>
          <Link
            href={qs(monthKey(new Date().getFullYear(), new Date().getMonth()), projectId)}
            className="rounded-lg border border-[var(--color-line-2)] px-3 py-1.5 text-[13px] font-semibold text-[var(--color-ink-2)] hover:bg-[var(--color-surface-2)]"
          >
            Today
          </Link>
        </div>
      </div>

      <ContentCalendar
        year={year}
        month={month}
        posts={posts}
        projects={projects.map((p: any) => ({ id: p.id, name: p.name }))}
        activeProjectId={projectId ?? ''}
      />
    </div>
  );
}
