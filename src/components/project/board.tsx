import Link from 'next/link';
import { ActorTag, AgentStatusDot } from '../actor';

const COLUMNS: { key: string; label: string }[] = [
  { key: 'todo', label: 'Todo' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Done' },
];

const PRIORITY_COLOR: Record<string, string> = {
  urgent: 'var(--color-blocked)',
  high: 'var(--color-brand)',
  medium: 'var(--color-muted)',
  low: 'var(--color-faint)',
};

export function Board({ cols, slug }: { cols: Record<string, any[]>; slug: string }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      {COLUMNS.map((c) => {
        const tasks = cols[c.key] ?? [];
        return (
          <div key={c.key} className="min-w-0">
            <div className="mb-2 flex items-center gap-2 px-1 text-[12px] font-semibold text-[var(--color-muted)]">
              {c.label}
              <span className="text-[var(--color-faint)]">{tasks.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {tasks.map((t) => {
                const isAgent = !!t.agents?.name;
                const state = c.key === 'blocked' ? 'blocked' : c.key === 'review' ? 'waiting' : 'working';
                return (
                  <Link
                    key={t.id}
                    href={`/projects/${slug}?tab=board&task=${t.id}`}
                    className="block rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3 hover:border-[var(--color-line-2)]"
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className="mt-1.5 size-1.5 shrink-0 rounded-full"
                        style={{ background: PRIORITY_COLOR[t.priority] ?? PRIORITY_COLOR.medium }}
                      />
                      <span className="text-[13px] leading-snug text-[var(--color-ink)]">{t.title}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <ActorTag agent={t.agents?.name} human={t.assignee_is_human ? 'You' : null} />
                      {isAgent && c.key !== 'done' && <AgentStatusDot state={state as any} />}
                    </div>
                    {c.key === 'review' && (
                      <div className="mt-1.5 text-[10px] text-[var(--color-brand-soft)]">
                        agent set to review · only you mark Done
                      </div>
                    )}
                  </Link>
                );
              })}
              {tasks.length === 0 && (
                <div className="rounded-xl border border-dashed border-[var(--color-line)] p-3 text-center text-[11px] text-[var(--color-faint)]">
                  —
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
