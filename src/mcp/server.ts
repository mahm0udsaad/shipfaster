import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { TOOLS, TOOLS_BY_NAME } from './registry';
import { renderDescription } from './lib/tool';
import { authenticate } from './lib/auth';
import { forbidden, ToolError } from './lib/errors';

/**
 * ship-faster MCP server (stdio).
 * Auth: the bearer token is read from SHIP_FASTER_TOKEN in the server env (per-agent
 * process). Each agent runs the server with its own token, which resolves to a role
 * and project scope. Every tool call is checked against the tool's allowedRoles.
 */
async function main() {
  const server = new Server(
    { name: 'ship-faster', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );

  const ctxPromise = authenticate(process.env.SHIP_FASTER_TOKEN);

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS.map((t) => ({
      name: t.name,
      description: renderDescription(t.description),
      inputSchema: zodToJsonSchema(t.input as any, { target: 'jsonSchema7' }),
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const tool = TOOLS_BY_NAME.get(req.params.name);
    if (!tool) throw new ToolError('NOT_FOUND', `no tool named ${req.params.name}`);

    const ctx = await ctxPromise;
    if (!tool.allowedRoles.includes(ctx.role)) {
      throw forbidden(`role '${ctx.role}' may not call ${tool.name}`);
    }

    const parsed = tool.input.safeParse(req.params.arguments ?? {});
    if (!parsed.success) throw new ToolError('VALIDATION', parsed.error.message);

    try {
      const result = await tool.handler({ ctx, input: parsed.data });
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    } catch (err) {
      if (err instanceof ToolError) {
        return {
          isError: true,
          content: [{ type: 'text', text: JSON.stringify({ code: err.code, message: err.message }) }],
        };
      }
      throw err;
    }
  });

  await server.connect(new StdioServerTransport());
}

main().catch((err) => {
  console.error('[ship-faster mcp] fatal', err);
  process.exit(1);
});
