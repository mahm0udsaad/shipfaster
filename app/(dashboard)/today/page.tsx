import Link from 'next/link';
import { getTodayData } from '../../../src/lib/dashboard';
import { ActorTag, StatusPill } from '../../../src/components/actor';

export const dynamic = 'force-dynamic';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-faint)]">
      {children}
    </h2>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3">
      {children}
    </div>
  );
}

function dueLabel(due: string | null): { text: string; overdue: boolean } {
  if (!due) return { text: '', overdue: false };
  const d = new Date(due).getTime();
  const now = Date.now();
  const days = Math.round((d - now) / 864e5);
  if (days < 0) return { text: `${-days}d overdue`, overdue: true };
  if (days === 0) return { text: 'today', overdue: false };
  return { text: `in ${days}d`, overdue: false };
}

export default async function TodayPage() {
  const { approvals, due, blocked, stale } = await getTodayData();
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  const empty = !approvals.length && !due.length && !blocked.length && !stale.length;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="font-[var(--font-display)] text-2xl font-bold text-[var(--color-ink)]">Today</h1>
        <p className="text-[13px] text-[var(--color-muted)]">{today} · what needs you across everything</p>
      </div>

      {empty && (
        <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-8 text-center text-[var(--color-muted)]">
          You&apos;re clear. Agents are working — open a project or check Activity.
        </div>
      )}

      {approvals.length > 0 && (
        <section className="mb-6">
          <SectionLabel>Needs you · {approvals.length} waiting</SectionLabel>
          <div className="flex flex-col gap-2">
            {approvals.map((a: any) => (
              <Link key={a.id} href="/approvals">
                <Row>
                  <span className="rounded-md bg-[var(--color-agent)]/12 px-2 py-0.5 text-[11px] font-medium text-[var(--color-agent-3)]">
                    {a.kind.replace('_', ' ')}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[14px] text-[var(--color-ink)]">{a.title}</span>
                  <ActorTag agent={a.agents?.name} />
                  <StatusPill status="review" />
                </Row>
              </Link>
            ))}
          </div>
        </section>
      )}

      {due.length > 0 && (
        <section className="mb-6">
          <SectionLabel>Due &amp; overdue</SectionLabel>
          <div className="flex flex-col gap-2">
            {due.map((t: any) => {
              const dl = dueLabel(t.due_at);
              return (
                <Row key={t.id}>
                  <span className="min-w-0 flex-1 truncate text-[14px] text-[var(--color-ink)]">{t.title}</span>
                  <span className="text-[12px] text-[var(--color-faint)]">{t.projects?.name}</span>
                  <span
                    className={`text-[12px] font-medium ${dl.overdue ? 'text-[var(--color-blocked-2)]' : 'text-[var(--color-muted)]'}`}
                  >
                    {dl.text}
                  </span>
                </Row>
              );
            })}
          </div>
        </section>
      )}

      {blocked.length > 0 && (
        <section className="mb-6">
          <SectionLabel>Blocked</SectionLabel>
          <div className="flex flex-col gap-2">
            {blocked.map((t: any) => (
              <Row key={t.id}>
                <span className="min-w-0 flex-1 truncate text-[14px] text-[var(--color-ink)]">{t.title}</span>
                <ActorTag agent={t.agents?.name} />
                <span className="text-[12px] text-[var(--color-blocked-2)]">blocked</span>
              </Row>
            ))}
          </div>
        </section>
      )}

      {stale.length > 0 && (
        <section className="mb-6">
          <SectionLabel>Stale</SectionLabel>
          <div className="flex flex-col gap-2">
            {stale.map((p: any) => (
              <Link key={p.id} href={`/projects/${p.slug}`}>
                <Row>
                  <span className="min-w-0 flex-1 truncate text-[14px] text-[var(--color-ink)]">{p.name}</span>
                  <span className="text-[12px] text-[var(--color-faint)]">no recent activity</span>
                </Row>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
