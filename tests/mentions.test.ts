import { describe, it, expect } from 'vitest';
import { parseMentions } from '../src/lib/mentions';

describe('parseMentions', () => {
  it('finds a simple mention', () => {
    expect(parseMentions('hey @project-lead take a look')).toEqual(['project-lead']);
  });

  it('handles slashed agent names (worker/ship-faster, codex/bookitfly)', () => {
    expect(parseMentions('@worker/ship-faster please review')).toEqual(['worker/ship-faster']);
    expect(parseMentions('ping @codex/bookitfly and @codex/kafel')).toEqual([
      'codex/bookitfly',
      'codex/kafel',
    ]);
  });

  it('mention at the very start of the string', () => {
    expect(parseMentions('@project-lead schema is ready')).toEqual(['project-lead']);
  });

  it('dedupes and preserves first-seen order, case-insensitive', () => {
    expect(parseMentions('@Project-Lead @project-lead @worker/ship-faster @project-lead')).toEqual([
      'project-lead',
      'worker/ship-faster',
    ]);
  });

  it('trims trailing punctuation', () => {
    expect(parseMentions('done, @project-lead.')).toEqual(['project-lead']);
    expect(parseMentions('(@codex/kafel) and @worker/ship-faster!')).toEqual([
      'codex/kafel',
      'worker/ship-faster',
    ]);
  });

  it('does NOT treat email addresses or @@ as mentions', () => {
    expect(parseMentions('email me at a@b.com')).toEqual([]);
    expect(parseMentions('nope @@ghost')).toEqual([]);
  });

  it('returns nothing when there are no mentions', () => {
    expect(parseMentions('just a plain comment with no pings')).toEqual([]);
    expect(parseMentions('')).toEqual([]);
  });

  it('ignores a bare @ with no name', () => {
    expect(parseMentions('look @ this')).toEqual([]);
  });
});
