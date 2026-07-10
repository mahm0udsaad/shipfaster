/**
 * Dogfood: drive the real MCP worker loop against the ship-faster project itself.
 * Authenticates as the worker/ship-faster token, pulls a Context Pack for the
 * "Approvals inbox" task, comments, files a Session Log, and proposes a Brain update.
 * Everything it does appears in the dashboard (Activity + Approvals).
 *
 * Run: SHIP_FASTER_TOKEN=<worker token> node --env-file=.env.local --import tsx/esm scripts/dogfood-demo.ts
 */
import { authenticate } from '../src/mcp/lib/auth';
import { listProjectsTool } from '../src/mcp/tools/listProjects';
import { listTasksTool } from '../src/mcp/tools/listTasks';
import { getContextPackTool } from '../src/mcp/tools/getContextPack';
import { addCommentTool } from '../src/mcp/tools/addComment';
import { logSessionTool } from '../src/mcp/tools/logSession';
import { proposeBrainUpdateTool } from '../src/mcp/tools/proposeBrainUpdate';

async function main() {
  const ctx = await authenticate(process.env.SHIP_FASTER_TOKEN);
  console.log(`✓ authenticated as role=${ctx.role} scope=${ctx.projectScope.length ? 'project-scoped' : 'all'}`);

  const projects: any = await listProjectsTool.handler({ ctx, input: {} });
  const proj = projects.projects.find((p: any) => p.slug === 'ship-faster');
  if (!proj) throw new Error('worker cannot see ship-faster (scope issue)');
  console.log(`✓ worker sees ${projects.projects.length} project(s): ${projects.projects.map((p:any)=>p.slug).join(', ')}`);

  const tasks: any = await listTasksTool.handler({ ctx, input: { project_id: proj.id } });
  const task = tasks.tasks.find((t: any) => t.title.includes('Approvals inbox'));
  if (!task) throw new Error('Approvals inbox task not found');
  console.log(`✓ picked task: "${task.title}" [${task.status}]`);

  const pack: any = await getContextPackTool.handler({
    ctx,
    input: { project_id: proj.id, task_id: task.id, token_budget: 4000 },
  });
  console.log(`✓ pulled Context Pack → included: ${pack.manifest.included.join(', ')}`);

  await addCommentTool.handler({
    ctx,
    input: { task_id: task.id, body: 'Pulled the context pack. Building the Approvals inbox cards next.' },
  });
  console.log('✓ commented on the task');

  const session: any = await logSessionTool.handler({
    ctx,
    input: {
      project_id: proj.id,
      task_id: task.id,
      summary: 'Started M2 Approvals inbox. Reviewed brain-diff/client-message/plan-change card requirements.',
      changes: [{ type: 'note', ref: 'design §6.3', note: 'card specs + keyboard nav' }],
      tests_status: 'n/a',
      next_step: 'Build the three approval card types + approve/reject actions.',
    },
  });
  console.log(`✓ filed Session Log → id ${session.session_log.id}`);

  const prop: any = await proposeBrainUpdateTool.handler({
    ctx,
    input: {
      project_id: proj.id,
      section: 'current_state',
      operation: 'update',
      before_text: 'Next: Approvals inbox.',
      after_text: 'Approvals inbox in progress (cards + approve/reject).',
      evidence_session_log_id: session.session_log.id,
    },
  });
  console.log(`✓ proposed a Brain update → approval ${prop.approval_id} (waiting for you)`);

  console.log('\nDOGFOOD LOOP COMPLETE — check the dashboard: Today, Approvals, and the project Activity.');
}

main().catch((e) => {
  console.error('✗ dogfood failed:', e);
  process.exit(1);
});
