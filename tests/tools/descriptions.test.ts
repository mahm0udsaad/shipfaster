import { describe, it, expect } from 'vitest';
import { TOOLS } from '../../src/mcp/registry';
import { lintDescription } from '../../src/mcp/lib/lint';
import { renderDescription } from '../../src/mcp/lib/tool';

describe('MCP tool descriptions (§18.3b lint contract)', () => {
  for (const tool of TOOLS) {
    it(`${tool.name} has a clean, complete description`, () => {
      expect(lintDescription(tool.name, tool.description, tool.mutates)).toEqual([]);
    });

    it(`${tool.name} renders the six-part description`, () => {
      const rendered = renderDescription(tool.description);
      expect(rendered).toContain('Use when:');
      expect(rendered).toContain('Do NOT use when:');
      expect(rendered).toContain('Side effects:');
      expect(rendered).toContain('Returns:');
      expect(rendered).toContain('Errors:');
    });
  }

  it('every tool declares at least one allowed role', () => {
    for (const tool of TOOLS) expect(tool.allowedRoles.length).toBeGreaterThan(0);
  });
});
