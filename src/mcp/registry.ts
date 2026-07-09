import type { ToolDef } from './lib/tool';
import { listProjectsTool } from './tools/listProjects';
import { getProjectTool } from './tools/getProject';
import { listTasksTool } from './tools/listTasks';
import { searchTool } from './tools/search';

/**
 * The full ship-faster MCP tool surface. Target is 12 tools (docs/section-18-19 §18.3).
 * M0 ships the 4 read tools below; M1 adds create_task, update_task, add_comment,
 * log_session, get_brain, propose_brain_update, request_approval, get_context_pack.
 */
export const TOOLS: ToolDef<any>[] = [
  listProjectsTool,
  getProjectTool,
  listTasksTool,
  searchTool,
];

export const TOOLS_BY_NAME = new Map(TOOLS.map((t) => [t.name, t]));
