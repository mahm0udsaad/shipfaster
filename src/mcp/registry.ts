import type { ToolDef } from './lib/tool';
import { listProjectsTool } from './tools/listProjects';
import { getProjectTool } from './tools/getProject';
import { getContextPackTool } from './tools/getContextPack';
import { listTasksTool } from './tools/listTasks';
import { getBrainTool } from './tools/getBrain';
import { searchTool } from './tools/search';
import { createTaskTool } from './tools/createTask';
import { updateTaskTool } from './tools/updateTask';
import { addCommentTool } from './tools/addComment';
import { logSessionTool } from './tools/logSession';
import { proposeBrainUpdateTool } from './tools/proposeBrainUpdate';
import { requestApprovalTool } from './tools/requestApproval';
import { whoamiTool } from './tools/whoami';
import { claimTaskTool } from './tools/claimTask';
import { renameSelfTool } from './tools/renameSelf';

/**
 * The full ship-faster MCP tool surface — 12 tools (docs/section-18-19 §18.3).
 * Read (6): list_projects, get_project, get_context_pack, list_tasks, get_brain, search.
 * Write (4): create_task, update_task, add_comment, log_session.
 * Staged (2): propose_brain_update, request_approval.
 * Self/agency (3): whoami, claim_task, rename_self.
 */
export const TOOLS: ToolDef<any>[] = [
  listProjectsTool,
  getProjectTool,
  getContextPackTool,
  listTasksTool,
  getBrainTool,
  searchTool,
  createTaskTool,
  updateTaskTool,
  addCommentTool,
  logSessionTool,
  proposeBrainUpdateTool,
  requestApprovalTool,
  whoamiTool,
  claimTaskTool,
  renameSelfTool,
];

export const TOOLS_BY_NAME = new Map(TOOLS.map((t) => [t.name, t]));
