import Link from 'next/link';
import { getClientsView } from '../../../src/lib/views';

export const dynamic = 'force-dynamic';

function money(n: number) {
  return `$${n.toLocaleString()}`;
}

export default async function ClientsPage() {
  const clients = await getClientsView();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="font-[var(--font-display)] text-2xl font-bold text-[var(--color-ink)]">Clients</h1>
        <p className="text-[13px] text-[var(--color-muted)]">{clients.length} clients</p>
      </div>

      <div className="flex flex-col gap-3">
        {clients.map((c: any) => (
          <div key={c.id} className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
            <div className="flex items-center gap-2">
              <span className="font-[var(--font-display)] text-[15px] font-bold text-[var(--color-ink)]">{c.name}</span>
              {c.comms_channel && (
                <span className="rounded-md bg-[var(--color-surface-2)] px-2 py-0.5 text-[11px] text-[var(--color-muted)]">
                  {c.comms_channel}
                </span>
              )}
              {c.owed > 0 && (
                <span className="ml-auto text-[13px] font-semibold text-[var(--color-brand-soft)]">
                  {money(c.owed)} owed
                </span>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {c.projects.map((p: any) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.slug}`}
                  className="rounded-lg border border-[var(--color-line)] px-2.5 py-1 text-[12px] text-[var(--color-ink-2)] hover:border-[var(--color-line-2)]"
                >
                  {p.name}
                </Link>
              ))}
              {c.projects.length === 0 && <span className="text-[12px] text-[var(--color-faint)]">No projects</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
