import { StatusPill } from '../actor';

function money(n: number, c = 'USD') {
  const sym = c === 'EUR' ? '€' : c === 'USD' ? '$' : c + ' ';
  return `${sym}${n.toLocaleString()}`;
}

export function Milestones({ milestones }: { milestones: any[] }) {
  const currency = milestones[0]?.currency ?? 'USD';
  const paid = milestones.filter((m) => m.status === 'paid').reduce((s, m) => s + Number(m.amount), 0);
  const owed = milestones.filter((m) => m.status !== 'paid').reduce((s, m) => s + Number(m.amount), 0);
  const total = paid + owed;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
          <div className="text-[11px] uppercase tracking-wider text-[var(--color-faint)]">Project total</div>
          <div className="text-xl font-bold text-[var(--color-ink)]">{money(total, currency)}</div>
        </div>
        <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
          <div className="text-[11px] uppercase tracking-wider text-[var(--color-faint)]">Paid</div>
          <div className="text-xl font-bold text-[var(--color-success)]">{money(paid, currency)}</div>
        </div>
        <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
          <div className="text-[11px] uppercase tracking-wider text-[var(--color-faint)]">Owed</div>
          <div className="text-xl font-bold text-[var(--color-brand-soft)]">{money(owed, currency)}</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--color-line)]">
        {milestones.map((m, i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-b border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 last:border-0"
          >
            <span className="flex-1 text-[14px] text-[var(--color-ink)]">{m.title}</span>
            <StatusPill status={m.status} />
            <span className="w-24 text-right text-[14px] font-semibold text-[var(--color-ink-2)]">
              {money(Number(m.amount), m.currency)}
            </span>
          </div>
        ))}
        {milestones.length === 0 && (
          <div className="bg-[var(--color-surface)] px-4 py-6 text-center text-[13px] text-[var(--color-faint)]">
            No milestones yet.
          </div>
        )}
      </div>
    </div>
  );
}
