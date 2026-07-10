import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getProjectBySlug,
  getBoard,
  getBrainView,
  getActivityView,
} from '../../../../src/lib/views';
import { Board } from '../../../../src/components/project/board';
import { Brain } from '../../../../src/components/project/brain';
import { Activity } from '../../../../src/components/project/activity';
import { Milestones } from '../../../../src/components/project/milestones';
import { TaskDrawer } from '../../../../src/components/project/task-drawer';

export const dynamic = 'force-dynamic';

const TABS = ['board', 'brain', 'activity', 'milestones'] as const;
type Tab = (typeof TABS)[number];

function money(n: number, c = 'USD') {
  const sym = c === 'EUR' ? '€' : c === 'USD' ? '$' : c + ' ';
  return `${sym}${n.toLocaleString()}`;
}

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string; task?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const tab: Tab = (TABS as readonly string[]).includes(sp.tab ?? '') ? (sp.tab as Tab) : 'board';
  const milestones = (project as any).milestones ?? [];
  const owed = milestones.filter((m: any) => m.status !== 'paid').reduce((s: number, m: any) => s + Number(m.amount), 0);
  const paid = milestones.filter((m: any) => m.status === 'paid').reduce((s: number, m: any) => s + Number(m.amount), 0);
  const currency = milestones[0]?.currency ?? 'USD';

  return (
    <div className="mx-auto max-w-5xl">
      {/* header */}
      <div className="mb-1 text-[13px] text-[var(--color-faint)]">
        <Link href="/projects" className="hover:text-[var(--color-ink)]">
          ← projects
        </Link>
      </div>
      <div className="mb-5 flex items-center gap-3">
        <h1 className="font-[var(--font-display)] text-2xl font-bold text-[var(--color-ink)]">{project.name}</h1>
        <span className="text-[13px] text-[var(--color-faint)]">{(project as any).clients?.name ?? ''}</span>
        {(owed > 0 || paid > 0) && (
          <span className="ml-auto rounded-lg border border-[var(--color-line)] px-3 py-1 text-[12px] text-[var(--color-ink-2)]">
            {money(owed, currency)} owed · {money(paid, currency)} paid
          </span>
        )}
      </div>

      {/* tabs */}
      <div className="mb-6 flex gap-1 border-b border-[var(--color-line)]">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/projects/${slug}?tab=${t}`}
            className={`-mb-px border-b-2 px-3 py-2 text-[14px] capitalize ${
              tab === t
                ? 'border-[var(--color-brand)] font-semibold text-[var(--color-ink)]'
                : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink-2)]'
            }`}
          >
            {t}
          </Link>
        ))}
      </div>

      {tab === 'board' && <Board cols={await getBoard(project.id)} slug={slug} />}
      {tab === 'brain' && <Brain {...(await getBrainView(project.id))} />}
      {tab === 'activity' && <Activity {...(await getActivityView(project.id))} />}
      {tab === 'milestones' && <Milestones milestones={milestones} />}

      {sp.task && <TaskDrawer taskId={sp.task} slug={slug} />}
    </div>
  );
}
