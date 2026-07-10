'use client';

import { useEffect, useState, useTransition } from 'react';
import { createHandoffAction, getAssignableAgentsAction } from '../../lib/actions/handoff';

type Agent = { id: string; name: string; role: string };

/**
 * "Hand off" — create a task for the NEXT agent. The context you type goes INTO the task
 * (description + acceptance criteria); the generated prompt stays thin and just points the
 * incoming agent at the task, which it reads via get_context_pack.
 */
export function HandoffButton({
  projectId,
  slug,
  projectName,
  presetTitle,
  presetContext,
}: {
  projectId: string;
  slug: string;
  projectName: string;
  presetTitle?: string;
  presetContext?: string;
}) {
  const [open, setOpen] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [title, setTitle] = useState(presetTitle ?? '');
  const [context, setContext] = useState(presetContext ?? '');
  const [criteria, setCriteria] = useState('');
  const [assignee, setAssignee] = useState('');
  const [prompt, setPrompt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open && agents.length === 0) {
      getAssignableAgentsAction(projectId).then((a) => {
        setAgents(a as Agent[]);
        if (a[0]) setAssignee((a[0] as Agent).id);
      });
    }
  }, [open, projectId, agents.length]);

  function reset() {
    setPrompt(null);
    setCopied(false);
    setTitle(presetTitle ?? '');
    setContext(presetContext ?? '');
    setCriteria('');
  }

  function submit() {
    if (!title.trim() || !context.trim() || !assignee) return;
    startTransition(async () => {
      const res = await createHandoffAction({
        projectId,
        slug,
        title: title.trim(),
        description: context.trim(),
        acceptanceCriteria: criteria.trim() || undefined,
        assigneeAgentId: assignee,
      });
      setPrompt(res.prompt);
    });
  }

  async function copy() {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  const assigneeName = agents.find((a) => a.id === assignee)?.name;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-[var(--color-line-2)] px-3 py-1.5 text-[13px] font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface-2)]"
      >
        Hand off →
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            className="absolute inset-0 bg-black/60"
            onClick={() => {
              setOpen(false);
              reset();
            }}
            aria-label="Close"
          />
          <div className="relative flex max-h-[88vh] w-full max-w-2xl flex-col rounded-2xl border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-2xl">
            <div className="flex items-start justify-between border-b border-[var(--color-line)] p-5">
              <div>
                <h2 className="font-[var(--font-display)] text-lg font-bold text-[var(--color-ink)]">
                  Hand off to an agent · {projectName}
                </h2>
                <p className="text-[12px] text-[var(--color-muted)]">
                  {prompt
                    ? 'Task created. Paste this prompt into the incoming agent — the details live in the task.'
                    : 'The context you write goes into the task itself. The prompt stays thin.'}
                </p>
              </div>
              <button
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
                className="text-[var(--color-faint)] hover:text-[var(--color-ink)]"
              >
                ✕
              </button>
            </div>

            {!prompt ? (
              <>
                <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-5">
                  <label className="flex flex-col gap-1">
                    <span className="text-[12px] font-semibold text-[var(--color-ink-2)]">Task title</span>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Continue: wire the refunds flow"
                      className="rounded-lg border border-[var(--color-line)] bg-[var(--color-base)] px-3 py-2 text-[14px] text-[var(--color-ink)] outline-none focus:border-[var(--color-agent)]"
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-[12px] font-semibold text-[var(--color-ink-2)]">
                      Handoff context <span className="text-[var(--color-faint)]">· goes into the task, not the prompt</span>
                    </span>
                    <textarea
                      value={context}
                      onChange={(e) => setContext(e.target.value)}
                      rows={6}
                      placeholder="What's done, what's left, decisions made, gotchas, where the code is, what to watch out for…"
                      className="resize-none rounded-lg border border-[var(--color-line)] bg-[var(--color-base)] px-3 py-2 text-[13px] leading-relaxed text-[var(--color-ink)] outline-none focus:border-[var(--color-agent)]"
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-[12px] font-semibold text-[var(--color-ink-2)]">
                      Acceptance criteria <span className="text-[var(--color-faint)]">· optional, one per line</span>
                    </span>
                    <textarea
                      value={criteria}
                      onChange={(e) => setCriteria(e.target.value)}
                      rows={3}
                      placeholder="Refunds process end to end&#10;Covered by tests"
                      className="resize-none rounded-lg border border-[var(--color-line)] bg-[var(--color-base)] px-3 py-2 text-[13px] leading-relaxed text-[var(--color-ink)] outline-none focus:border-[var(--color-agent)]"
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-[12px] font-semibold text-[var(--color-ink-2)]">Assign to agent</span>
                    <select
                      value={assignee}
                      onChange={(e) => setAssignee(e.target.value)}
                      className="rounded-lg border border-[var(--color-line)] bg-[var(--color-base)] px-3 py-2 text-[14px] text-[var(--color-ink)] outline-none focus:border-[var(--color-agent)]"
                    >
                      {agents.length === 0 && <option>Loading…</option>}
                      {agents.map((a) => (
                        <option key={a.id} value={a.id}>
                          @{a.name} ({a.role})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="flex items-center gap-2 border-t border-[var(--color-line)] p-4">
                  <button
                    onClick={submit}
                    disabled={pending || !title.trim() || !context.trim() || !assignee}
                    className="rounded-lg bg-[var(--color-brand)] px-4 py-2 text-[13px] font-semibold text-black disabled:opacity-50"
                  >
                    {pending ? 'Creating…' : 'Create task + prompt'}
                  </button>
                  <span className="ml-auto text-[11px] text-[var(--color-faint)]">
                    Assigns to {assigneeName ? `@${assigneeName}` : 'an agent'}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="min-h-0 flex-1 overflow-auto p-5">
                  <pre className="whitespace-pre-wrap rounded-xl border border-[var(--color-line)] bg-[var(--color-base)] p-4 font-[var(--font-mono)] text-[12px] leading-relaxed text-[var(--color-ink-2)]">
                    {prompt}
                  </pre>
                </div>
                <div className="flex items-center gap-2 border-t border-[var(--color-line)] p-4">
                  <button
                    onClick={copy}
                    className="rounded-lg bg-[var(--color-brand)] px-4 py-2 text-[13px] font-semibold text-black"
                  >
                    {copied ? 'Copied ✓' : 'Copy prompt'}
                  </button>
                  <button
                    onClick={() => {
                      setOpen(false);
                      reset();
                    }}
                    className="rounded-lg border border-[var(--color-line-2)] px-4 py-2 text-[13px] font-semibold text-[var(--color-ink-2)]"
                  >
                    Done
                  </button>
                  <span className="ml-auto text-[11px] text-[var(--color-faint)]">
                    Task assigned to {assigneeName ? `@${assigneeName}` : 'the agent'} · details are in the task
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
