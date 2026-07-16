import { Sidebar } from '../../src/components/sidebar';
import { getOwnerContext, getPendingApprovalCount } from '../../src/lib/dashboard';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pending = await getPendingApprovalCount(await getOwnerContext());
  const owner = {
    name: process.env.OWNER_NAME ?? 'Mahmoud',
    plan: process.env.OWNER_PLAN ?? 'solo · free',
  };
  return (
    <div className="flex min-h-dvh bg-[var(--color-base)]">
      <Sidebar pendingApprovals={pending} owner={owner} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-[var(--color-line)] px-6">
          <div className="flex-1">
            <div className="flex h-8 max-w-md items-center gap-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 text-[13px] text-[var(--color-faint)]">
              Search or jump to…
              <span className="ml-auto rounded border border-[var(--color-line-2)] px-1.5 text-[11px]">⌘K</span>
            </div>
          </div>
          <button className="flex h-8 items-center gap-1.5 rounded-lg bg-[var(--color-brand)] px-3 text-[13px] font-semibold text-black">
            + New
          </button>
        </header>
        <main className="min-w-0 flex-1 overflow-auto px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
