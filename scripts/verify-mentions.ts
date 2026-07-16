/**
 * End-to-end verification of the agent-mention + inbox + long-poll wake feature,
 * against the LIVE Supabase database. Drives the real tool handlers -> repository -> Postgres.
 * Contexts are constructed literals (like tests/), so no bearer tokens are used.
 * Run: node --env-file=.env.local --import tsx/esm scripts/verify-mentions.ts
 */
import type { ActorContext } from '../src/lib/db/repository';
import { createTask } from '../src/lib/db/repository';
import { serviceClient } from '../src/lib/db/client';
import { addCommentTool } from '../src/mcp/tools/addComment';
import { getInboxTool } from '../src/mcp/tools/getInbox';
import { waitForMentionsTool } from '../src/mcp/tools/waitForMentions';
import { markReadTool } from '../src/mcp/tools/markRead';

const PROJECT = '1938b148-24e5-4289-bb7e-6e07d4f1e01c';
const WORKER = 'f9a04c8e-b42e-45e6-babb-baa25c284184'; // worker/ship-faster (recipient)
const CODEX = '7519cd57-e575-45c9-bd16-bee676cc837f'; // codex/ship-faster (mentioner)
const ACCOUNT = process.env.OWNER_ACCOUNT_ID ?? '';

const worker: ActorContext = { agentId: WORKER, accountId: ACCOUNT, actorType: 'agent', role: 'worker', projectScope: [PROJECT] };
const codex: ActorContext = { agentId: CODEX, accountId: ACCOUNT, actorType: 'agent', role: 'worker', projectScope: [PROJECT] };

const db = serviceClient();
let taskId: string | undefined;

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error('ASSERT FAILED: ' + msg);
  console.log('  ✓ ' + msg);
}

async function main() {
  // Fixture: a task owned by codex/ship-faster so it may comment on it (worker-only rule).
  const t: any = await createTask(codex, {
    projectId: PROJECT,
    title: '[verify-mentions] fixture — safe to delete',
    assigneeAgentId: CODEX,
  });
  taskId = t.id;
  console.log(`fixture task ${taskId}`);

  // 1. Mention parsing + notification fan-out (one real agent + one unknown handle).
  console.log('\n1) codex comments, mentioning @worker/ship-faster and an unknown @ghost/none');
  const c1: any = await addCommentTool.handler({
    ctx: codex,
    input: { task_id: taskId!, body: 'kicking off — @worker/ship-faster please take the review; @ghost/none' },
  });
  assert(c1.mentioned.includes('worker/ship-faster'), 'worker/ship-faster was notified');
  assert(c1.unresolved.includes('ghost/none'), 'unknown handle reported as unresolved');

  // Self-mention must NOT notify.
  const c1b: any = await addCommentTool.handler({
    ctx: codex,
    input: { task_id: taskId!, body: 'note to self @codex/ship-faster' },
  });
  assert(c1b.mentioned.length === 0, 'self-mention creates no notification');

  // 2. Inbox catch-up.
  console.log('\n2) worker/ship-faster reads its inbox');
  const inbox1: any = await getInboxTool.handler({ ctx: worker, input: {} });
  const mine = inbox1.notifications.filter((n: any) => n.task_id === taskId);
  assert(mine.length === 1, `inbox shows the one mention (got ${mine.length})`);
  assert(mine[0].actor?.name === 'codex/ship-faster', 'notification carries the mentioner name');
  assert(mine[0].project?.name === 'ship-faster', 'notification carries the project name');

  // 3. The WAKE: park on wait_for_mentions, then have codex mention worker mid-wait.
  console.log('\n3) worker parks on wait_for_mentions; codex mentions it 2s later');
  const since = new Date().toISOString();
  const started = Date.now();
  const waiting = waitForMentionsTool.handler({
    ctx: worker,
    input: { since, timeout_seconds: 15, poll_interval_ms: 500 },
  });
  await new Promise((r) => setTimeout(r, 2000));
  await addCommentTool.handler({
    ctx: codex,
    input: { task_id: taskId!, body: '@worker/ship-faster wake up — schema is ready' },
  });
  const woke: any = await waiting;
  const elapsed = Date.now() - started;
  assert(woke.notifications.length >= 1, 'wait_for_mentions returned the new mention');
  assert(elapsed < 15000, `woke before timeout (${elapsed}ms < 15000ms)`);
  assert(typeof woke.cursor === 'string', 'returned a cursor to resume from');

  // 4. mark_read clears the backlog.
  console.log('\n4) worker marks read');
  const marked: any = await markReadTool.handler({ ctx: worker, input: {} });
  assert(marked.marked >= 2, `marked the mentions read (${marked.marked})`);
  const inbox2: any = await getInboxTool.handler({ ctx: worker, input: {} });
  assert(inbox2.notifications.filter((n: any) => n.task_id === taskId).length === 0, 'unread inbox now empty');
  const inbox3: any = await getInboxTool.handler({ ctx: worker, input: { include_read: true } });
  assert(
    inbox3.notifications.filter((n: any) => n.task_id === taskId).length >= 2,
    'include_read still returns the handled mentions',
  );

  console.log('\nALL MENTION/WAKE CHECKS PASSED');
}

async function cleanup() {
  if (!taskId) return;
  // notifications + comments cascade on task delete; activity.task_id is SET NULL, so clear those first.
  await db.from('activity').delete().eq('task_id', taskId);
  await db.from('tasks').delete().eq('id', taskId);
  console.log('cleaned up fixture task + its activity');
}

main()
  .then(cleanup)
  .catch(async (e) => {
    await cleanup().catch(() => {});
    console.error('✗ verification failed:', e);
    process.exit(1);
  });
