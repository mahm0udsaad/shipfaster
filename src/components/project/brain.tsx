import { ActorTag, ProposedBadge } from '../actor';

const SECTION_ORDER = ['current_state', 'decisions', 'conventions', 'environment', 'client_notes', 'open_questions'];
const SECTION_LABEL: Record<string, string> = {
  current_state: 'Current state',
  decisions: 'Decisions',
  conventions: 'Conventions',
  environment: 'Environment',
  client_notes: 'Client notes',
  open_questions: 'Open questions',
};

export function Brain({ sections, proposed }: { sections: any[]; proposed: any[] }) {
  const bySection = new Map(sections.map((s) => [s.section, s]));
  const proposedBySection = new Map<string, any[]>();
  for (const p of proposed) {
    const arr = proposedBySection.get(p.section) ?? [];
    arr.push(p);
    proposedBySection.set(p.section, arr);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center gap-2 text-[12px] text-[var(--color-faint)]">
        Project memory · versioned · human-owned
      </div>
      <div className="flex flex-col gap-4">
        {SECTION_ORDER.map((key) => {
          const s = bySection.get(key);
          const props = proposedBySection.get(key) ?? [];
          const empty = !s || !s.body?.trim();
          return (
            <div key={key} className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-[13px] font-semibold text-[var(--color-ink)]">{SECTION_LABEL[key]}</span>
                {s && <span className="text-[11px] text-[var(--color-faint)]">v{s.version}</span>}
              </div>
              {empty ? (
                <div className="text-[13px] italic text-[var(--color-faint)]">
                  {SECTION_LABEL[key]} is empty. Seed it so agents know how this project works.
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--color-ink-2)]">{s.body}</p>
              )}
              {props.map((p, i) => (
                <div
                  key={i}
                  className="mt-3 rounded-lg border border-[var(--color-agent)]/30 bg-[var(--color-agent)]/[0.06] p-3"
                >
                  <div className="mb-1 flex items-center gap-2">
                    <ProposedBadge />
                    <ActorTag agent={p.agents?.name} />
                  </div>
                  <p className="text-[13px] text-[var(--color-ink-2)]">{p.after_text}</p>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
