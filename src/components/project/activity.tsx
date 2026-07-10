import { ActorTag } from '../actor';

function ago(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function Activity({ activity, sessions }: { activity: any[]; sessions: any[] }) {
  // merge into one time-ordered feed; session logs render richly
  const items = [
    ...sessions.map((s) => ({ type: 'session' as const, at: s.created_at, data: s })),
    ...activity.map((a) => ({ type: 'event' as const, at: a.created_at, data: a })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  if (!items.length) {
    return <div className="text-[13px] text-[var(--color-faint)]">No activity yet.</div>;
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-2">
      {items.map((it, i) =>
        it.type === 'session' ? (
          <div key={`s${i}`} className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
            <div className="mb-2 flex items-center gap-2 text-[12px]">
              <span className="rounded bg-[var(--color-agent)]/12 px-1.5 py-0.5 font-medium uppercase tracking-wide text-[var(--color-agent-3)]">
                session log
              </span>
              <ActorTag agent={it.data.agents?.name} />
              <span className="ml-auto text-[var(--color-faint)]">{ago(it.at)}</span>
            </div>
            <p className="text-[13px] text-[var(--color-ink-2)]">{it.data.summary}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[var(--color-muted)]">
              {Array.isArray(it.data.changes) &&
                it.data.changes.map((c: any, j: number) => (
                  <span key={j}>
                    {c.ref ?? c.type} {c.note ? `· ${c.note}` : ''}
                  </span>
                ))}
              {it.data.tests_status && <span className="text-[var(--color-success)]">✓ {it.data.tests_status}</span>}
              {it.data.next_step && <span>→ next: {it.data.next_step}</span>}
            </div>
          </div>
        ) : (
          <div key={`e${i}`} className="flex items-center gap-3 px-2 py-1.5 text-[13px]">
            <span className="size-1.5 shrink-0 rounded-full bg-[var(--color-line-2)]" />
            <ActorTag agent={it.data.agents?.name} human={it.data.actor_type === 'human' ? 'You' : null} />
            <span className="text-[var(--color-ink-2)]">{it.data.summary}</span>
            <span className="ml-auto text-[12px] text-[var(--color-faint)]">{ago(it.at)}</span>
          </div>
        ),
      )}
    </div>
  );
}
