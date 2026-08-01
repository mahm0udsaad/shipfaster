import { getAgentsView } from '../../../src/lib/views';
import { requireFullAccess } from '../../../src/lib/auth/session';

export const dynamic = 'force-dynamic';

const ROLE_LABEL: Record<string, string> = {
  owner: 'Owner',
  project_lead: 'Project Lead',
  worker: 'Worker',
  intake: 'Intake',
  brain_sync: 'Brain Sync',
};

function ago(iso: string | null) {
  if (!iso) return 'never';
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export default async function AgentsPage() {
  const agents = await getAgentsView((await requireFullAccess()).ctx);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-[var(--font-display)] text-2xl font-bold text-[var(--color-ink)]">Agents</h1>
          <p className="text-[13px] text-[var(--color-muted)]">{agents.length} agent identities</p>
        </div>
        <button className="rounded-lg bg-[var(--color-brand)] px-3 py-1.5 text-[13px] font-semibold text-black">
          + Connect an agent
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--color-line)]">
        {agents.map((a: any) => (
          <div
            key={a.id}
            className="flex items-center gap-3 border-b border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 last:border-0"
          >
            <span className="grid size-8 place-items-center rounded-full bg-[var(--color-agent)]/15 text-[12px] font-bold text-[var(--color-agent-3)]">
              {a.role === 'worker' ? 'W' : a.role === 'project_lead' ? 'PL' : a.name.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="handle">@{a.name}</div>
              <div className="text-[12px] text-[var(--color-faint)]">
                {ROLE_LABEL[a.role] ?? a.role}
                {a.scopeNames.length > 0 ? ` · ${a.scopeNames.join(', ')}` : ' · all projects'}
              </div>
            </div>
            {a.tokensSpent > 0 && (
              <span className="rounded-md bg-[var(--color-agent)]/12 px-2 py-0.5 font-[var(--font-mono)] text-[11px] text-[var(--color-agent-3)]">
                {a.tokensSpent >= 1000 ? `${(a.tokensSpent / 1000).toFixed(1)}k` : a.tokensSpent} tokens
              </span>
            )}
            <span className="text-[12px] text-[var(--color-muted)]">active {ago(a.last_active_at)}</span>
            {a.revoked_at ? (
              <span className="text-[12px] text-[var(--color-blocked-2)]">revoked</span>
            ) : (
              <button className="rounded-lg border border-[var(--color-line-2)] px-2.5 py-1 text-[12px] text-[var(--color-muted)] hover:text-[var(--color-blocked-2)]">
                Revoke
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
