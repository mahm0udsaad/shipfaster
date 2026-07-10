'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { setTaskStatusAction } from '../../lib/actions/tasks';

/**
 * Human close/reopen controls for the task drawer.
 * "Mark Done" is human-only by design (Section 19 — Workers can only reach `review`).
 */
export function TaskActions({ taskId, slug, status }: { taskId: string; slug: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isDone = status === 'done';

  function set(next: 'done' | 'todo') {
    startTransition(async () => {
      await setTaskStatusAction(taskId, next, slug);
      router.push(`/projects/${slug}?tab=board`);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      {!isDone ? (
        <button
          disabled={pending}
          onClick={() => set('done')}
          className="rounded-lg bg-[var(--color-success)] px-4 py-2 text-[13px] font-semibold text-black disabled:opacity-50"
        >
          {pending ? 'Closing…' : 'Mark Done'}
        </button>
      ) : (
        <button
          disabled={pending}
          onClick={() => set('todo')}
          className="rounded-lg border border-[var(--color-line-2)] px-4 py-2 text-[13px] font-semibold text-[var(--color-ink-2)] disabled:opacity-50"
        >
          {pending ? 'Reopening…' : 'Reopen'}
        </button>
      )}
      <span className="ml-auto text-[11px] text-[var(--color-faint)]">Only humans can mark a task Done.</span>
    </div>
  );
}
