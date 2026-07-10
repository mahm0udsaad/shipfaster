/**
 * Agent-native primitives (design brief §4). A consistent visual language for
 * "who acted" — human vs. agent — used across every screen.
 */

/** ActorTag — an agent shows a monospace @handle in agent-blue; a human shows an initials avatar. */
export function ActorTag({ agent, human }: { agent?: string | null; human?: string | null }) {
  if (agent) {
    return <span className="handle">@{agent}</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-[var(--color-ink-2)]">
      <span className="grid size-5 place-items-center rounded-full bg-[var(--color-line-2)] text-[10px] font-semibold text-[var(--color-ink)]">
        {(human ?? 'You').slice(0, 2).toUpperCase()}
      </span>
      {human ?? 'You'}
    </span>
  );
}

/** ProposedBadge — marks a staged, not-yet-applied agent change. */
export function ProposedBadge() {
  return (
    <span className="rounded-full border border-[var(--color-agent)]/40 bg-[var(--color-agent)]/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--color-agent-3)]">
      PROPOSED
    </span>
  );
}

const STATUS_STYLE: Record<string, string> = {
  todo: 'text-[var(--color-muted)] bg-[var(--color-line)]',
  in_progress: 'text-[var(--color-agent-3)] bg-[var(--color-agent)]/12',
  blocked: 'text-[var(--color-blocked-2)] bg-[var(--color-blocked)]/12',
  review: 'text-[var(--color-brand-soft)] bg-[var(--color-brand-soft)]/12',
  done: 'text-[var(--color-success)] bg-[var(--color-success)]/12',
  cancelled: 'text-[var(--color-faint)] bg-[var(--color-line)]',
  open: 'text-[var(--color-brand-soft)] bg-[var(--color-brand-soft)]/12',
};

export function StatusPill({ status }: { status: string }) {
  const cls = STATUS_STYLE[status] ?? STATUS_STYLE.todo;
  return (
    <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

/** AgentStatusDot — subtle working/blocked/waiting signal on agent-assigned work. */
export function AgentStatusDot({ state }: { state: 'working' | 'blocked' | 'waiting' }) {
  const color =
    state === 'blocked'
      ? 'var(--color-blocked)'
      : state === 'waiting'
        ? 'var(--color-brand-soft)'
        : 'var(--color-success)';
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--color-muted)]">
      <span className="size-1.5 rounded-full" style={{ background: color }} />
      {state}
    </span>
  );
}
