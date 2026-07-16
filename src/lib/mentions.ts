/**
 * Mention parsing for agent-to-agent coordination.
 *
 * Agent names look like `worker/ship-faster`, `codex/bookitfly`, or `project-lead`,
 * so a mention token can contain letters, digits, `_`, `-`, `/` and `.`. A mention is
 * `@` immediately followed by such a name, at a word boundary (start of string or after
 * whitespace/most punctuation — but NOT after another `@` or a name char, so emails like
 * `a@b` and `@@x` don't produce spurious mentions).
 *
 * Pure and dependency-free on purpose: this is unit-tested without a database.
 */

// Boundary: start, or a char that is not a word char, `@`, `/`, `-`, `.`.
// Name: starts alnum, then any of [alnum _ - / .]; trailing punctuation is trimmed after.
const MENTION_RE = /(?:^|[^\w@/.-])@([a-z0-9][a-z0-9._/-]*)/gi;

/**
 * Extract the distinct mentioned names from a comment body, preserving first-seen order
 * and normalizing to lowercase (agent names are matched case-insensitively downstream).
 * Trailing separator punctuation (`. , / -`) is stripped so "@project-lead." → "project-lead".
 */
export function parseMentions(body: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of body.matchAll(MENTION_RE)) {
    const raw = m[1];
    if (!raw) continue;
    const name = raw.replace(/[._/-]+$/, '').toLowerCase(); // trim trailing separators
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  return out;
}
