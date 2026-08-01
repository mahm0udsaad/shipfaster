import Link from 'next/link';
import { ActorTag, StatusPill } from '../actor';
import { getTaskDetail } from '../../lib/views';
import { requireFullAccess } from '../../lib/auth/session';
import { TaskActions } from './task-actions';

export async function TaskDrawer({ taskId, slug }: { taskId: string; slug: string }) {
  const detail = await getTaskDetail((await requireFullAccess()).ctx, taskId);
  if (!detail) return null;
  const { task, comments, pack } = detail;
  const closeHref = `/projects/${slug}?tab=board`;

  return (
    <>
      <Link href={closeHref} className="fixed inset-0 z-40 bg-black/50" aria-label="Close" />
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-lg overflow-auto border-l border-[var(--color-line)] bg-[var(--color-surface)] p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[12px]">
            <span className="text-[var(--color-faint)]">#{task.id.slice(0, 4)}</span>
            <StatusPill status={task.status} />
            {task.status === 'review' && <span className="text-[var(--color-brand-soft)]">waiting for you</span>}
          </div>
          <Link href={closeHref} className="text-[var(--color-faint)] hover:text-[var(--color-ink)]">
            ✕
          </Link>
        </div>

        <h2 className="font-[var(--font-display)] text-xl font-bold text-[var(--color-ink)]">{task.title}</h2>

        {(task.creator?.name || task.tokens_spent > 0) && (
          <div className="mt-2 flex items-center gap-2 text-[12px] text-[var(--color-faint)]">
            <span>Created by</span>
            <ActorTag agent={task.creator?.name} human={task.creator?.name ? null : 'You'} />
            {task.tokens_spent > 0 && (
              <span className="rounded-md bg-[var(--color-agent)]/12 px-2 py-0.5 font-[var(--font-mono)] text-[11px] text-[var(--color-agent-3)]">
                {task.tokens_spent.toLocaleString()} tokens
              </span>
            )}
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-3 text-[12px]">
          <div>
            <div className="text-[var(--color-faint)]">Assignee</div>
            <div className="mt-1">
              <ActorTag agent={task.agents?.name} human={task.assignee_is_human ? 'You' : null} />
            </div>
          </div>
          <div>
            <div className="text-[var(--color-faint)]">Priority</div>
            <div className="mt-1 capitalize text-[var(--color-ink-2)]">{task.priority}</div>
          </div>
          <div>
            <div className="text-[var(--color-faint)]">Due</div>
            <div className="mt-1 text-[var(--color-ink-2)]">
              {task.due_at ? new Date(task.due_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
            </div>
          </div>
        </div>

        {task.description && (
          <p className="mt-4 text-[13px] leading-relaxed text-[var(--color-ink-2)]">{task.description}</p>
        )}

        {task.acceptance_criteria && (
          <div className="mt-4 rounded-xl border border-[var(--color-line)] bg-[var(--color-base)] p-4">
            <div className="mb-2 text-[12px] font-semibold text-[var(--color-ink)]">
              Acceptance criteria <span className="text-[var(--color-faint)]">· required for agent work</span>
            </div>
            <ul className="flex flex-col gap-1.5 text-[13px] text-[var(--color-ink-2)]">
              {task.acceptance_criteria.split('\n').map((c: string, i: number) => (
                <li key={i} className="flex gap-2">
                  <span className="text-[var(--color-success)]">✓</span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 rounded-xl border border-[var(--color-agent)]/25 bg-[var(--color-agent)]/[0.05] p-4">
          <div className="mb-2 text-[12px] font-semibold text-[var(--color-agent-3)]">
            Context Pack <span className="text-[var(--color-faint)]">· what the agent sees</span>
          </div>
          <ul className="flex flex-col gap-1 text-[12px] text-[var(--color-ink-2)]">
            {pack.manifest.included.map((k) => (
              <li key={k} className="flex items-center gap-2">
                <span className="text-[var(--color-agent-3)]">›</span>
                {k.replace(/[._]/g, ' ')}
              </li>
            ))}
          </ul>
          {pack.manifest.dropped.length > 0 && (
            <div className="mt-2 text-[11px] text-[var(--color-faint)]">
              dropped (over budget): {pack.manifest.dropped.join(', ')}
            </div>
          )}
        </div>

        {comments.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 text-[12px] font-semibold text-[var(--color-ink)]">Comments</div>
            <div className="flex flex-col gap-3">
              {comments.map((c: any, i: number) => (
                <div key={i} className="text-[13px]">
                  <div className="mb-0.5">
                    <ActorTag agent={c.agents?.name} human={c.actor_type === 'human' ? 'You' : null} />
                  </div>
                  <p className="text-[var(--color-ink-2)]">{c.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 border-t border-[var(--color-line)] pt-4">
          <TaskActions taskId={task.id} slug={slug} status={task.status} />
        </div>
      </aside>
    </>
  );
}
