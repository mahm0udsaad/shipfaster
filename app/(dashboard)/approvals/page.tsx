import { getOpenApprovals } from '../../../src/lib/db/repository';
import { ApprovalsClient } from './approvals-client';

export const dynamic = 'force-dynamic';

export default async function ApprovalsPage() {
  const approvals = await getOpenApprovals();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-[var(--font-display)] text-2xl font-bold text-[var(--color-ink)]">Approvals</h1>
          <p className="text-[13px] text-[var(--color-muted)]">
            Everything your agents propose waits here. Nothing commits without your click.
          </p>
        </div>
        <div className="hidden items-center gap-2 text-[11px] text-[var(--color-faint)] md:flex">
          <kbd className="rounded border border-[var(--color-line-2)] px-1.5 py-0.5">J</kbd>
          <kbd className="rounded border border-[var(--color-line-2)] px-1.5 py-0.5">K</kbd>
          move
          <kbd className="ml-2 rounded border border-[var(--color-line-2)] px-1.5 py-0.5">A</kbd>
          approve
          <kbd className="rounded border border-[var(--color-line-2)] px-1.5 py-0.5">R</kbd>
          reject
        </div>
      </div>

      <ApprovalsClient approvals={approvals} />
    </div>
  );
}
