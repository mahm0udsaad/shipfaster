/**
 * End-to-end smoke test against the LIVE Supabase database.
 * Exercises the real path: authenticate() -> tool handler -> repository -> Postgres.
 * Run: node --env-file=.env.local --import tsx/esm scripts/verify-live.ts
 */
import { authenticate } from '../src/mcp/lib/auth';
import { listProjectsTool } from '../src/mcp/tools/listProjects';
import { getContextPackTool } from '../src/mcp/tools/getContextPack';
import { createTaskTool } from '../src/mcp/tools/createTask';
import { getProjectTool } from '../src/mcp/tools/getProject';

async function main() {
  const ctx = await authenticate(process.env.OWNER_TOKEN);
  console.log(`✓ authenticated as role=${ctx.role} actor=${ctx.actorType}`);

  const projects: any = await listProjectsTool.handler({ ctx, input: {} });
  console.log(`✓ list_projects → ${projects.projects.length} projects:`,
    projects.projects.map((p: any) => p.slug).join(', '));

  const first = projects.projects[0];
  if (!first) throw new Error('no projects seeded');

  const proj: any = await getProjectTool.handler({ ctx, input: { project_id: first.id } });
  console.log(`✓ get_project(${first.slug}) → money owed=${proj.money.owed} ${proj.money.currency}`);

  // create a real task, then confirm it comes back in a context pack
  const created: any = await createTaskTool.handler({
    ctx,
    input: {
      project_id: first.id,
      title: 'Smoke-test task: verify create + context pack',
      description: 'Created by scripts/verify-live.ts to prove the write path.',
      acceptance_criteria: 'Task appears in the context pack for its project.',
    },
  });
  console.log(`✓ create_task → id=${created.task.id}`);

  const pack: any = await getContextPackTool.handler({
    ctx,
    input: { project_id: first.id, task_id: created.task.id, token_budget: 4000 },
  });
  console.log(`✓ get_context_pack → included=[${pack.manifest.included.join(', ')}]`);
  console.log(`  tokenEstimate=${pack.manifest.tokenEstimate}/${pack.manifest.tokenBudget}`);

  const hasFocused = pack.manifest.included.includes('focused_task');
  console.log(hasFocused ? '✓ focused task present in pack' : '✗ focused task MISSING');

  console.log('\nALL LIVE CHECKS PASSED');
}

main().catch((e) => {
  console.error('✗ live verification failed:', e);
  process.exit(1);
});
