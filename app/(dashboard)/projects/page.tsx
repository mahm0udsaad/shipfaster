import Link from 'next/link';
import { getProjectsOverview } from '../../../src/lib/views';
import { getOwnerContext } from '../../../src/lib/dashboard';

export const dynamic = 'force-dynamic';

function money(n: number, c = 'USD') {
  const sym = c === 'EUR' ? '€' : c === 'USD' ? '$' : c + ' ';
  return `${sym}${n.toLocaleString()}`;
}

export default async function ProjectsPage() {
  const projects = await getProjectsOverview(await getOwnerContext());
  const activeAgents = projects.filter((p) => p.agentActive).length;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-[var(--font-display)] text-2xl font-bold text-[var(--color-ink)]">Projects</h1>
          <p className="text-[13px] text-[var(--color-muted)]">
            {projects.length} projects · {activeAgents} with an agent
          </p>
        </div>
        <button className="rounded-lg border border-[var(--color-line-2)] px-3 py-1.5 text-[13px] font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface-2)]">
          + New project
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/projects/${p.slug}`}
            className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5 transition-colors hover:border-[var(--color-line-2)]"
          >
            <div className="flex items-center gap-2">
              <span className="font-[var(--font-display)] text-[15px] font-bold text-[var(--color-ink)]">{p.name}</span>
              {p.agentActive && (
                <span className="flex items-center gap-1 text-[11px] text-[var(--color-success)]">
                  <span className="size-1.5 rounded-full bg-[var(--color-success)]" /> agent
                </span>
              )}
              {p.stale && <span className="text-[11px] text-[var(--color-faint)]">· stale</span>}
            </div>
            <div className="mt-1 text-[12px] text-[var(--color-faint)]">Client · {p.client ?? '—'}</div>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <div className="text-lg font-bold text-[var(--color-ink)]">{p.openTasks}</div>
                <div className="text-[11px] uppercase tracking-wider text-[var(--color-faint)]">open tasks</div>
              </div>
              <div className="text-right">
                <div className="text-[14px] font-semibold text-[var(--color-ink-2)]">
                  {p.nextMilestone ? money(p.nextMilestone.amount, p.nextMilestone.currency) : '—'}
                </div>
                <div className="text-[11px] uppercase tracking-wider text-[var(--color-faint)]">next milestone</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
