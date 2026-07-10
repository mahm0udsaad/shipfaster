'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV: { href: string; label: string; badgeKey?: 'approvals' }[] = [
  { href: '/today', label: 'Today' },
  { href: '/approvals', label: 'Approvals', badgeKey: 'approvals' },
  { href: '/projects', label: 'Projects' },
  { href: '/clients', label: 'Clients' },
  { href: '/money', label: 'Money' },
  { href: '/agents', label: 'Agents' },
];

function Spark() {
  return (
    <svg viewBox="0 0 100 100" className="size-6" aria-hidden>
      <polygon
        points="50,1 55.4,33.9 79.4,9.6 63.9,40 97.6,34.6 67.5,50 97.6,65.4 63.9,60 79.4,90.4 55.4,66.1 50,99 44.6,66.1 20.6,90.4 36.1,60 2.4,65.4 32.5,50 2.4,34.6 36.1,40 20.6,9.6 44.6,33.9"
        fill="var(--color-brand)"
      />
    </svg>
  );
}

export function Sidebar({
  pendingApprovals,
  owner,
}: {
  pendingApprovals: number;
  owner: { name: string; plan: string };
}) {
  const path = usePathname();
  const initials = owner.name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  function toggleTheme() {
    const el = document.documentElement;
    el.dataset.theme = el.dataset.theme === 'light' ? 'dark' : 'light';
  }

  return (
    <aside className="flex h-dvh w-60 shrink-0 flex-col border-r border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-4">
      <div className="flex items-center gap-2 px-2 pb-5">
        <Spark />
        <span className="font-[var(--font-display)] text-[15px] font-bold tracking-tight text-[var(--color-ink)]">
          shipfaster
        </span>
      </div>

      <nav className="flex flex-col gap-0.5">
        {NAV.map((item) => {
          const active = path === item.href || path.startsWith(item.href + '/');
          const badge = item.badgeKey === 'approvals' && pendingApprovals > 0 ? pendingApprovals : null;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-[14px] transition-colors ${
                active
                  ? 'bg-[var(--color-elevated)] font-semibold text-[var(--color-ink)]'
                  : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink-2)]'
              }`}
            >
              <span>{item.label}</span>
              {badge && (
                <span className="grid min-w-5 place-items-center rounded-full bg-[var(--color-brand)] px-1.5 text-[11px] font-bold text-black">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-2">
        <button
          onClick={toggleTheme}
          className="rounded-lg px-3 py-2 text-left text-[13px] text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink-2)]"
        >
          Toggle theme
        </button>
        <div className="flex items-center gap-2.5 rounded-lg border border-[var(--color-line)] px-3 py-2.5">
          <span className="grid size-8 place-items-center rounded-full bg-[var(--color-agent)]/20 text-[12px] font-bold text-[var(--color-agent-3)]">
            {initials}
          </span>
          <div className="leading-tight">
            <div className="text-[13px] font-semibold text-[var(--color-ink)]">{owner.name}</div>
            <div className="text-[11px] text-[var(--color-faint)]">{owner.plan}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
