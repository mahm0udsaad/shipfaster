import { authenticate } from '../src/mcp/lib/auth';
import { TOOLS_BY_NAME } from '../src/mcp/registry';

async function main() {
  const [, , toolName, jsonArgs] = process.argv;
  if (!toolName) throw new Error('usage: run-tool <tool_name> [jsonArgs]');
  const token = process.env.RUN_AS === 'owner' ? process.env.OWNER_TOKEN : process.env.SHIP_FASTER_TOKEN;
  if (!token) throw new Error('no token (set SHIP_FASTER_TOKEN, or RUN_AS=owner with OWNER_TOKEN)');
  const ctx = await authenticate(token);
  const tool = TOOLS_BY_NAME.get(toolName);
  if (!tool) throw new Error(`no tool ${toolName}`);
  const input = jsonArgs ? JSON.parse(jsonArgs) : {};
  const parsed = tool.input.safeParse(input);
  if (!parsed.success) throw new Error('VALIDATION: ' + parsed.error.message);
  const result = await tool.handler({ ctx, input: parsed.data });
  console.log(JSON.stringify({ ctx, result }, null, 2));
}
main().catch((e) => { console.error('ERR', e); process.exit(1); });
