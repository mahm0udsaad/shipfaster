import { Pricing } from '../src/components/landing/pricing';
import { Faq } from '../src/components/landing/faq';

function Spark({ className = 'size-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <polygon
        points="50,1 55.4,33.9 79.4,9.6 63.9,40 97.6,34.6 67.5,50 97.6,65.4 63.9,60 79.4,90.4 55.4,66.1 50,99 44.6,66.1 20.6,90.4 36.1,60 2.4,65.4 32.5,50 2.4,34.6 36.1,40 20.6,9.6 44.6,33.9"
        fill="var(--color-brand)"
      />
    </svg>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--color-brand)]">
      {children}
    </div>
  );
}

const FEATURES = [
  {
    tag: 'Context Packs',
    title: 'Agents that already know the project.',
    body: 'Brain, task, acceptance criteria, recent history — assembled automatically the moment an agent picks up work.',
  },
  {
    tag: 'Project Brain',
    title: 'Memory that compounds instead of evaporating.',
    body: 'Durable, versioned per-project memory. Human-owned and editable — agents propose, you approve.',
  },
  {
    tag: 'Approvals Inbox',
    title: 'Autonomy you actually control.',
    body: 'Anything touching clients, money, or memory waits for one human click. Agents move fast inside their lane.',
  },
  {
    tag: 'Money View',
    title: 'See what every client owes.',
    body: 'Milestones with amounts, fixed-price and retainer, in one place.',
  },
  {
    tag: 'Session Logs',
    title: 'Every agent session, on the record.',
    body: 'Summary, files changed, tests, blockers, next step — reviewable in seconds.',
  },
];

const COMPARE = [
  ['Briefs agents with full project context', true, false],
  ['Memory that compounds across sessions', true, false],
  ['Approval layer for agent actions', true, false],
  ['Structured agent work reports', true, false],
  ['Client milestones & what’s owed', true, false],
] as const;

const STEPS = [
  { n: '1', t: 'Brief', d: 'A Context Pack briefs the agent — no re-explaining.' },
  { n: '2', t: 'Work', d: 'The agent works in your repo, inside its lane.' },
  { n: '3', t: 'Report', d: 'A structured Session Log files the work back.' },
  { n: '4', t: 'Remember', d: 'It compounds into durable Project Brain.' },
];

export default function Landing() {
  return (
    <div className="min-h-dvh bg-[var(--color-base)] text-[var(--color-ink)]">
      {/* nav */}
      <header className="sticky top-0 z-50 border-b border-[var(--color-line)] bg-[var(--color-base)]/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-6">
          <a href="/" className="flex items-center gap-2">
            <Spark className="size-5" />
            <span className="font-[var(--font-display)] font-bold tracking-tight">shipfaster</span>
          </a>
          <nav className="ml-4 hidden gap-6 text-[14px] text-[var(--color-muted)] md:flex">
            <a href="#how" className="hover:text-[var(--color-ink)]">How it works</a>
            <a href="#pricing" className="hover:text-[var(--color-ink)]">Pricing</a>
            <a href="#" className="hover:text-[var(--color-ink)]">Docs</a>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-[14px]">
            <a href="/today" className="text-[var(--color-muted)] hover:text-[var(--color-ink)]">Sign in</a>
            <a href="/today" className="rounded-lg bg-[var(--color-brand)] px-3.5 py-1.5 font-semibold text-black">
              Start free
            </a>
          </div>
        </div>
      </header>

      {/* hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-2">
        <div>
          <Eyebrow>the context layer for coding agents</Eyebrow>
          <h1 className="font-[var(--font-display)] text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            Every coding agent
            <br />
            starts briefed.
          </h1>
          <p className="mt-5 max-w-md text-[16px] leading-relaxed text-[var(--color-ink-2)]">
            shipfaster gives Claude Code, Cursor, and Codex the task, Brain, decisions, and recent
            history for each client project, then files the work back for review.
          </p>
          <div className="mt-7 flex items-center gap-3">
            <a href="/today" className="rounded-lg bg-[var(--color-brand)] px-5 py-3 text-[15px] font-semibold text-black">
              Start with a project →
            </a>
            <a href="#how" className="rounded-lg border border-[var(--color-line-2)] px-5 py-3 text-[15px] font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface-2)]">
              See the loop
            </a>
          </div>
          <div className="mt-10">
            <div className="mb-2 text-[11px] uppercase tracking-wider text-[var(--color-faint)]">
              Built for the tools already in your workflow
            </div>
            <div className="flex gap-4 text-[13px] font-medium text-[var(--color-muted)]">
              <span>Claude Code</span> · <span>Cursor</span> · <span>Codex</span>
            </div>
          </div>
        </div>

        {/* hero visual — an agent pulling a Context Pack, task handed to review */}
        <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5 shadow-2xl">
          <div className="mb-4 flex items-center justify-between text-[12px]">
            <span className="text-[var(--color-muted)]">bookitfly · task #142</span>
            <span className="flex items-center gap-1.5 text-[var(--color-success)]">
              <span className="size-1.5 rounded-full bg-[var(--color-success)]" /> agent working
            </span>
          </div>
          <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-base)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[13px] font-semibold">Context Pack</span>
              <span className="handle">@worker/bookitfly</span>
            </div>
            <div className="flex flex-col gap-2 text-[12px]">
              {[
                ['Project Brain', '6 sections'],
                ['Task + acceptance criteria', ''],
                ['Recent activity', '3 sessions'],
              ].map(([a, b]) => (
                <div key={a} className="flex items-center justify-between rounded-lg bg-[var(--color-surface-2)] px-3 py-2">
                  <span className="text-[var(--color-ink-2)]">{a}</span>
                  <span className="text-[var(--color-faint)]">{b}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="my-3 text-center text-[11px] uppercase tracking-wider text-[var(--color-faint)]">
            status: in progress → <span className="text-[var(--color-brand-soft)]">review</span>
          </div>
          <div className="rounded-xl border border-[var(--color-brand-soft)]/30 bg-[var(--color-brand-soft)]/[0.06] p-4">
            <div className="text-[13px] font-medium">Add Stripe webhook retry with idempotency keys</div>
            <div className="mt-2 flex items-center justify-between text-[12px]">
              <span className="handle">@worker/bookitfly</span>
              <span className="text-[var(--color-brand-soft)]">waiting for you</span>
            </div>
          </div>
        </div>
      </section>

      {/* problem */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <Eyebrow>The problem</Eyebrow>
        <h2 className="font-[var(--font-display)] text-3xl font-bold md:text-4xl">
          Agents are fast. Their context isn’t.
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            ['Every session starts from zero.', 'You re-explain the stack, the client, the decisions — every single time an agent spins up.'],
            ['Decisions get lost.', 'Scattered across WhatsApp, email, and your head. Agents can’t read what you never wrote down.'],
            ['You can’t tell what they did.', 'Work happens in a repo you didn’t watch. No report, no trail, no way to trust it at a glance.'],
          ].map(([t, d]) => (
            <div key={t} className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6">
              <div className="mb-2 font-[var(--font-display)] text-lg font-bold text-[var(--color-ink)]">{t}</div>
              <p className="text-[14px] leading-relaxed text-[var(--color-muted)]">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* how it works */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-20">
        <Eyebrow>How it works</Eyebrow>
        <h2 className="font-[var(--font-display)] text-3xl font-bold md:text-4xl">
          One loop. Brief → Work → Report → Remember.
        </h2>
        <p className="mt-3 max-w-2xl text-[15px] text-[var(--color-muted)]">
          Every task an agent touches runs the same loop. Context flows in, work flows back, memory
          compounds.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6">
              <div className="mb-4 grid size-8 place-items-center rounded-lg bg-[var(--color-brand)]/12 font-[var(--font-display)] font-bold text-[var(--color-brand)]">
                {s.n}
              </div>
              <div className="mb-1 font-[var(--font-display)] text-lg font-bold">{s.t}</div>
              <p className="text-[13px] leading-relaxed text-[var(--color-muted)]">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <Eyebrow>What you get</Eyebrow>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {FEATURES.map((f, i) => (
            <div
              key={f.tag}
              className={`rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-7 ${
                i === 0 ? 'md:col-span-2' : ''
              }`}
            >
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-agent-3)]">
                {f.tag}
              </div>
              <div className="mb-2 font-[var(--font-display)] text-xl font-bold text-[var(--color-ink)]">
                {f.title}
              </div>
              <p className="max-w-lg text-[14px] leading-relaxed text-[var(--color-muted)]">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* comparison */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <Eyebrow>Why not just Linear</Eyebrow>
        <h2 className="font-[var(--font-display)] text-3xl font-bold md:text-4xl">
          Not another issue tracker. A context layer for agents.
        </h2>
        <div className="mt-8 overflow-hidden rounded-2xl border border-[var(--color-line)]">
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-[var(--color-line)] bg-[var(--color-surface-2)] px-5 py-3 text-[12px] font-semibold uppercase tracking-wider text-[var(--color-faint)]">
            <span>Capability</span>
            <span className="w-24 text-center text-[var(--color-brand)]">shipfaster</span>
            <span className="w-24 text-center">Generic PM</span>
          </div>
          {COMPARE.map(([cap, us, them]) => (
            <div
              key={cap as string}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-[var(--color-line)] bg-[var(--color-surface)] px-5 py-3.5 text-[14px] last:border-0"
            >
              <span className="text-[var(--color-ink-2)]">{cap}</span>
              <span className="w-24 text-center text-[var(--color-success)]">{us ? '✓' : '—'}</span>
              <span className="w-24 text-center text-[var(--color-faint)]">{them ? '✓' : '—'}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-xl border border-dashed border-[var(--color-line-2)] px-5 py-4 text-center text-[13px] text-[var(--color-faint)]">
          Headline metric — soon · <span className="text-[var(--color-brand-soft)]">— % less agent rework</span>
        </div>
      </section>

      {/* pricing */}
      <section id="pricing" className="mx-auto max-w-5xl px-6 py-20">
        <div className="mb-8 text-center">
          <Eyebrow>Pricing</Eyebrow>
          <h2 className="font-[var(--font-display)] text-3xl font-bold md:text-4xl">
            Flat pricing. No per-action metering.
          </h2>
        </div>
        <Pricing />
      </section>

      {/* faq */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="mb-8 text-center">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="font-[var(--font-display)] text-3xl font-bold md:text-4xl">Straight answers.</h2>
        </div>
        <Faq />
      </section>

      {/* final CTA */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <h2 className="font-[var(--font-display)] text-4xl font-bold md:text-5xl">Give every agent the full handoff.</h2>
        <p className="mx-auto mt-4 max-w-lg text-[16px] text-[var(--color-muted)]">
          Create a project, capture the Brain, and send your next coding agent in with context.
        </p>
        <div className="mt-7 flex items-center justify-center gap-3">
          <a href="/today" className="rounded-lg bg-[var(--color-brand)] px-6 py-3 text-[15px] font-semibold text-black">
            Start with a project
          </a>
          <a href="#how" className="rounded-lg border border-[var(--color-line-2)] px-6 py-3 text-[15px] font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface-2)]">
            See the loop
          </a>
        </div>
      </section>

      {/* footer */}
      <footer className="border-t border-[var(--color-line)]">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 md:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <Spark className="size-5" />
              <span className="font-[var(--font-display)] font-bold">shipfaster</span>
            </div>
            <p className="mt-3 max-w-xs text-[13px] text-[var(--color-muted)]">
              The context layer for your coding agents.
            </p>
          </div>
          {[
            ['Product', ['How it works', 'Pricing', 'FAQ']],
            ['Developers', ['Docs', 'GitHub', 'MCP registry']],
            ['Company', ['Privacy', 'Terms', 'X / Twitter']],
          ].map(([h, links]) => (
            <div key={h as string}>
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-faint)]">{h}</div>
              <ul className="flex flex-col gap-2 text-[13px] text-[var(--color-muted)]">
                {(links as string[]).map((l) => (
                  <li key={l}>
                    <a href="#" className="hover:text-[var(--color-ink)]">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-[var(--color-line)] px-6 py-5 text-center text-[12px] text-[var(--color-faint)]">
          © 2026 shipfaster, inc.
        </div>
      </footer>
    </div>
  );
}
