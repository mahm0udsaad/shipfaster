import { getMoneyOverview } from '../../../src/lib/views';
import { getOwnerContext } from '../../../src/lib/dashboard';
import { StatusPill } from '../../../src/components/actor';

export const dynamic = 'force-dynamic';

function money(n: number, c = 'USD') {
  const sym = c === 'EUR' ? '€' : c === 'USD' ? '$' : c + ' ';
  return `${sym}${n.toLocaleString()}`;
}

export default async function MoneyPage() {
  const { byCurrency, unpaid } = await getMoneyOverview(await getOwnerContext());
  const currencies = Object.entries(byCurrency);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="font-[var(--font-display)] text-2xl font-bold text-[var(--color-ink)]">Money</h1>
        <p className="text-[13px] text-[var(--color-muted)]">What every client owes, across all projects.</p>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        {currencies.map(([c, v]) => (
          <div key={c} className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
            <div className="text-[11px] uppercase tracking-wider text-[var(--color-faint)]">Owed ({c})</div>
            <div className="text-3xl font-bold text-[var(--color-brand-soft)]">{money(v.owed, c)}</div>
            <div className="mt-1 text-[12px] text-[var(--color-success)]">{money(v.paid, c)} paid</div>
          </div>
        ))}
        {currencies.length === 0 && (
          <div className="text-[13px] text-[var(--color-faint)]">No milestones with amounts yet.</div>
        )}
      </div>

      {unpaid.length > 0 && (
        <>
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-faint)]">
            Outstanding
          </h2>
          <div className="overflow-hidden rounded-2xl border border-[var(--color-line)]">
            {unpaid.map((m: any, i: number) => (
              <div
                key={i}
                className="flex items-center gap-3 border-b border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 last:border-0"
              >
                <div className="flex-1">
                  <div className="text-[14px] text-[var(--color-ink)]">{m.title}</div>
                  <div className="text-[12px] text-[var(--color-faint)]">
                    {m.projects?.clients?.name ?? m.projects?.name}
                  </div>
                </div>
                <StatusPill status={m.status} />
                <span className="w-24 text-right text-[14px] font-semibold text-[var(--color-ink-2)]">
                  {money(Number(m.amount), m.currency)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
