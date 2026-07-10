'use client';

import { useState } from 'react';

const QA = [
  {
    q: 'Does it run my agents?',
    a: 'No — ship-faster briefs the agents you already use (Claude Code, Cursor, Codex) and files their work back. It is the context layer, not a runtime.',
  },
  {
    q: 'Which agents does it work with?',
    a: 'Any MCP-capable agent. First-class support for Claude Code and Cursor; Codex and others connect through the same MCP tools.',
  },
  {
    q: 'Is my client data safe?',
    a: 'Every agent runs under a scoped, least-privilege token, and everything it does is logged and attributed. Anything touching clients, money, or memory waits for your approval.',
  },
  {
    q: 'Can I self-host?',
    a: 'Yes. The Solo tier is self-hostable and free. Pro and Agency are hosted and managed.',
  },
  {
    q: 'Do agents message my clients?',
    a: 'Never automatically. Agents draft client messages; you review and send them yourself.',
  },
  {
    q: 'How is it different from Linear or Jira?',
    a: 'Those track issues for humans. ship-faster briefs agents with project memory, captures their work as structured logs, and adds an approval layer — plus freelancer milestone and money tracking they do not have.',
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="mx-auto max-w-2xl divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]">
      {QA.map((item, i) => (
        <div key={item.q}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="flex w-full items-center justify-between py-4 text-left"
          >
            <span className="text-[15px] font-medium text-[var(--color-ink)]">{item.q}</span>
            <span className="text-[var(--color-faint)]">{open === i ? '−' : '+'}</span>
          </button>
          {open === i && <p className="pb-4 text-[14px] leading-relaxed text-[var(--color-muted)]">{item.a}</p>}
        </div>
      ))}
    </div>
  );
}
