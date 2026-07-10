'use client';

import { useEffect, useState, useTransition } from 'react';
import type { ApprovalCard } from '../../../src/lib/db/repository';
import { ActorTag } from '../../../src/components/actor';
import { resolveApprovalAction } from './actions';

const KIND_LABEL: Record<string, string> = {
  brain_diff: 'brain diff',
  client_message: 'client message',
  task_plan: 'plan change',
  scope: 'scope question',
  other: 'action',
};

function DiffBlock({ before, after }: { before: string | null; after: string | null }) {
  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-[var(--color-line)] text-[13px]">
      {before && (
        <div className="border-b border-[var(--color-line)] bg-[var(--color-blocked)]/[0.06] px-3 py-2 text-[var(--color-muted)]">
          <span className="mr-2 text-[var(--color-blocked-2)]">−</span>
          {before}
        </div>
      )}
      <div className="bg-[var(--color-success)]/[0.06] px-3 py-2 text-[var(--color-ink-2)]">
        <span className="mr-2 text-[var(--color-success)]">+</span>
        {after}
      </div>
    </div>
  );
}

function Card({
  a,
  selected,
  busy,
  onResolve,
}: {
  a: ApprovalCard;
  selected: boolean;
  busy: boolean;
  onResolve: (id: string, d: 'approve' | 'reject') => void;
}) {
  const isClientMsg = a.kind === 'client_message';
  const msg = a.payload?.message as string | undefined;
  const subtasks = (a.payload?.subtasks as string[] | undefined) ?? [];

  return (
    <div
      className={`rounded-2xl border bg-[var(--color-surface)] p-5 transition-colors ${
        selected ? 'border-[var(--color-agent)]/60' : 'border-[var(--color-line)]'
      }`}
    >
      <div className="mb-2 flex items-center gap-2 text-[12px]">
        <span className="rounded-md bg-[var(--color-agent)]/12 px-2 py-0.5 font-medium uppercase tracking-wide text-[var(--color-agent-3)]">
          {KIND_LABEL[a.kind] ?? a.kind}
        </span>
        <span className="text-[var(--color-faint)]">{a.projectName}</span>
        <span className="ml-auto">
          <ActorTag agent={a.agentName} />
        </span>
      </div>

      <div className="text-[15px] font-semibold text-[var(--color-ink)]">{a.title}</div>

      {a.kind === 'brain_diff' && a.diff && (
        <>
          <div className="mt-1 text-[12px] text-[var(--color-faint)]">Brain · {a.diff.section}</div>
          <DiffBlock before={a.diff.before} after={a.diff.after} />
          {a.diff.evidence && (
            <div className="mt-2 text-[12px] text-[var(--color-faint)]">
              via {String(a.diff.evidence).startsWith('session') ? a.diff.evidence : `session ${a.diff.evidence}`} · see evidence
            </div>
          )}
        </>
      )}

      {isClientMsg && msg && (
        <>
          <div className="mt-3 rounded-lg border border-[var(--color-line)] bg-[var(--color-base)] p-3 text-[13px] leading-relaxed text-[var(--color-ink-2)]">
            {msg}
          </div>
          <div className="mt-2 text-[12px] text-[var(--color-brand-soft)]">
            Drafted for you — we never message clients. You review and send.
          </div>
        </>
      )}

      {a.kind === 'task_plan' && subtasks.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5 text-[13px] text-[var(--color-ink-2)]">
          {subtasks.map((s) => (
            <li key={s} className="flex items-center gap-2">
              <span className="text-[var(--color-success)]">+</span>
              {s}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex items-center gap-2">
        <button
          disabled={busy}
          onClick={() => onResolve(a.id, 'approve')}
          className="rounded-lg bg-[var(--color-success)] px-4 py-2 text-[13px] font-semibold text-black disabled:opacity-50"
        >
          {isClientMsg ? 'Mark sent' : 'Approve'}
        </button>
        <button
          disabled={busy}
          onClick={() => onResolve(a.id, 'reject')}
          className="rounded-lg border border-[var(--color-line-2)] px-4 py-2 text-[13px] font-semibold text-[var(--color-ink-2)] hover:bg-[var(--color-surface-2)] disabled:opacity-50"
        >
          {isClientMsg ? 'Discard' : 'Reject'}
        </button>
        {isClientMsg && (
          <button
            onClick={() => navigator.clipboard?.writeText(msg ?? '')}
            className="rounded-lg border border-[var(--color-line-2)] px-4 py-2 text-[13px] font-semibold text-[var(--color-ink-2)] hover:bg-[var(--color-surface-2)]"
          >
            Copy
          </button>
        )}
        <span className="ml-auto text-[11px] text-[var(--color-faint)]">
          {selected ? 'press A approve · R reject' : ''}
        </span>
      </div>
    </div>
  );
}

export function ApprovalsClient({ approvals }: { approvals: ApprovalCard[] }) {
  const [sel, setSel] = useState(0);
  const [pending, startTransition] = useTransition();

  function resolve(id: string, decision: 'approve' | 'reject') {
    startTransition(async () => {
      await resolveApprovalAction(id, decision);
    });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!approvals.length || pending) return;
      const cur = approvals[Math.min(sel, approvals.length - 1)];
      if (e.key === 'j') setSel((s) => Math.min(s + 1, approvals.length - 1));
      else if (e.key === 'k') setSel((s) => Math.max(s - 1, 0));
      else if (e.key === 'a' && cur) resolve(cur.id, 'approve');
      else if (e.key === 'r' && cur) resolve(cur.id, 'reject');
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [approvals, sel, pending]);

  if (!approvals.length) {
    return (
      <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-10 text-center">
        <div className="text-[15px] font-semibold text-[var(--color-ink)]">Inbox zero.</div>
        <div className="mt-1 text-[13px] text-[var(--color-muted)]">
          Nothing waiting on you. Your agents are working — check Activity to see what&apos;s in flight.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {approvals.map((a, i) => (
        <div key={a.id} onMouseEnter={() => setSel(i)}>
          <Card a={a} selected={i === sel} busy={pending} onResolve={resolve} />
        </div>
      ))}
    </div>
  );
}
