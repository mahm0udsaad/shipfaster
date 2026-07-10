'use client';

import { useState, useTransition } from 'react';
import { getAgentBriefingAction } from '../../lib/actions/briefing';

/**
 * "New Agent" — opens a modal with a self-contained onboarding brief for the project
 * (Brain + open tasks + operating rules) that can be pasted into a fresh agent session.
 */
export function NewAgentButton({ projectId, projectName }: { projectId: string; projectName: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function openModal() {
    setOpen(true);
    setCopied(false);
    startTransition(async () => {
      setText(await getAgentBriefingAction(projectId));
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      <button
        onClick={openModal}
        className="flex items-center gap-1.5 rounded-lg bg-[var(--color-brand)] px-3 py-1.5 text-[13px] font-semibold text-black"
      >
        + New Agent
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} aria-label="Close" />
          <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-2xl">
            <div className="flex items-start justify-between border-b border-[var(--color-line)] p-5">
              <div>
                <h2 className="font-[var(--font-display)] text-lg font-bold text-[var(--color-ink)]">
                  Brief a new agent on {projectName}
                </h2>
                <p className="text-[12px] text-[var(--color-muted)]">
                  Paste this into a fresh Claude Code / Cursor / Codex session — it orients the agent and lists the open work.
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="text-[var(--color-faint)] hover:text-[var(--color-ink)]">
                ✕
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-5">
              {pending && !text ? (
                <div className="py-10 text-center text-[13px] text-[var(--color-muted)]">Assembling the brief…</div>
              ) : (
                <pre className="whitespace-pre-wrap rounded-xl border border-[var(--color-line)] bg-[var(--color-base)] p-4 font-[var(--font-mono)] text-[12px] leading-relaxed text-[var(--color-ink-2)]">
                  {text}
                </pre>
              )}
            </div>

            <div className="flex items-center gap-2 border-t border-[var(--color-line)] p-4">
              <button
                onClick={copy}
                disabled={!text}
                className="rounded-lg bg-[var(--color-brand)] px-4 py-2 text-[13px] font-semibold text-black disabled:opacity-50"
              >
                {copied ? 'Copied ✓' : 'Copy prompt'}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg border border-[var(--color-line-2)] px-4 py-2 text-[13px] font-semibold text-[var(--color-ink-2)]"
              >
                Close
              </button>
              <span className="ml-auto text-[11px] text-[var(--color-faint)]">
                {text ? `${text.length.toLocaleString()} chars` : ''}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
