import { TOOLS } from '../src/mcp/registry';
import { lintDescription } from '../src/mcp/lib/lint';

/**
 * CI guard: fail the build if any MCP tool has a smelly description
 * (docs/section-18-19 §18.3b). Run via `npm run lint:tools`.
 */
let failures = 0;
for (const tool of TOOLS) {
  const problems = lintDescription(tool.name, tool.description, tool.mutates);
  for (const p of problems) {
    console.error(`✗ ${tool.name}: ${p}`);
    failures++;
  }
}

if (failures > 0) {
  console.error(`\n${failures} tool-description problem(s). Fix before shipping.`);
  process.exit(1);
}
console.log(`✓ ${TOOLS.length} tool descriptions pass the lint contract.`);
