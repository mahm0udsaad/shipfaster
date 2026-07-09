import type { ToolDescription } from './tool';

/**
 * The description-lint contract (docs/section-18-19 §18.3b).
 * Enforces that every field is present and substantive, and that the two most
 * smell-prone rules are followed:
 *   - a MUTATING tool must declare its side effects (not "none");
 *   - staged tools must say nothing is applied until approval.
 * A read-only tool may legitimately say "none".
 * Returns a list of problems (empty = clean).
 */
const MIN_LEN = 15;
const NONE = /^none\.?$/i;

export function lintDescription(name: string, d: ToolDescription, mutates = false): string[] {
  const problems: string[] = [];

  const fields: (keyof ToolDescription)[] = [
    'summary',
    'useWhen',
    'doNotUseWhen',
    'sideEffects',
    'returns',
    'errors',
  ];
  for (const f of fields) {
    const v = (d[f] ?? '').trim();
    if (!v) {
      problems.push(`missing '${f}'`);
      continue;
    }
    // 'none' is an acceptable sideEffects value for read-only tools despite being short.
    if (f === 'sideEffects' && NONE.test(v) && !mutates) continue;
    if (v.length < MIN_LEN) problems.push(`'${f}' too thin (<${MIN_LEN} chars)`);
  }

  // summary should be verb-first-ish: not start with "This" or "A ".
  if (/^(this|a |an |the )/i.test(d.summary.trim())) {
    problems.push(`summary should be verb-first, not start with "${d.summary.split(' ')[0]}"`);
  }

  // errors field should reference at least one typed error code.
  if (!/(NOT_FOUND|FORBIDDEN_FOR_ROLE|APPROVAL_REQUIRED|VALIDATION|RATE_LIMITED)/.test(d.errors)) {
    problems.push(`'errors' must name at least one typed error code`);
  }

  // a mutating tool must not claim "none" for side effects.
  if (mutates && NONE.test(d.sideEffects.trim())) {
    problems.push(`mutating tool must declare its side effects, not "none"`);
  }

  // staged/approval tools must state nothing is applied until approval.
  if (/propose|request_approval|approval/i.test(name)) {
    if (!/(approv|until|staged|proposal|not applied|nothing is)/i.test(d.sideEffects)) {
      problems.push(`staged tool must state in sideEffects that nothing is applied until approval`);
    }
  }

  return problems;
}
