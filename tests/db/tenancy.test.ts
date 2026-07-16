import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Tenant-isolation contract for the repository layer.
 *
 * Everything runs on the service-role key, which bypasses RLS — so the account filter in
 * this layer is the thing actually keeping tenants apart, not a redundant belt on top of a
 * database policy. These tests assert the invariant structurally rather than function by
 * function: a new repository read that forgets the filter fails the battery below without
 * anyone remembering to write a test for it.
 */

type Call = {
  table: string;
  op: 'select' | 'insert' | 'update' | null;
  filters: [string, unknown][];
  payload?: any;
  single?: boolean;
};

let calls: Call[] = [];
let nextRow: any = null;
let nextRows: any[] = [];

vi.mock('../../src/lib/db/client', () => ({
  serviceClient: () => ({
    from(table: string) {
      const call: Call = { table, op: null, filters: [] };
      calls.push(call);
      const b: any = {
        select(cols?: string) {
          call.op ??= 'select';
          return b;
        },
        insert(payload: any) {
          call.op = 'insert';
          call.payload = payload;
          return b;
        },
        update(payload: any) {
          call.op = 'update';
          call.payload = payload;
          return b;
        },
        eq(c: string, v: unknown) {
          call.filters.push([c, v]);
          return b;
        },
        in(c: string, v: unknown) {
          call.filters.push([c, v]);
          return b;
        },
        maybeSingle() {
          call.single = true;
          return b;
        },
        single() {
          call.single = true;
          return b;
        },
        is: () => b,
        gt: () => b,
        lte: () => b,
        neq: () => b,
        not: () => b,
        ilike: () => b,
        textSearch: () => b,
        order: () => b,
        limit: () => b,
        then: (resolve: any, reject: any) =>
          Promise.resolve({
            data: call.single ? nextRow : nextRows,
            error: null,
            count: 0,
          }).then(resolve, reject),
      };
      return b;
    },
  }),
}));

const repo = await import('../../src/lib/db/repository');
type ActorContext = import('../../src/lib/db/repository').ActorContext;

const ACCOUNT_A = 'aaaaaaaa-0000-0000-0000-000000000000';
const ACCOUNT_B = 'bbbbbbbb-0000-0000-0000-000000000000';
const PROJECT_A = '11111111-1111-1111-1111-111111111111';
const PROJECT_B = '22222222-2222-2222-2222-222222222222';
const TASK_A = '33333333-3333-3333-3333-333333333333';

/** The owner of account A: empty projectScope, i.e. "every project — within my account". */
const ownerA: ActorContext = {
  agentId: null,
  accountId: ACCOUNT_A,
  actorType: 'human',
  role: 'owner',
  projectScope: [],
};

/** A worker in account A, scoped to a single project. */
const workerA: ActorContext = {
  agentId: 'agent-a',
  accountId: ACCOUNT_A,
  actorType: 'agent',
  role: 'worker',
  projectScope: [PROJECT_A],
};

/** Tables carrying an account_id anchor (migration 0004). */
const TENANT_TABLES = [
  'clients',
  'projects',
  'agents',
  'tasks',
  'milestones',
  'comments',
  'activity',
  'session_logs',
  'brain_sections',
  'brain_diffs',
  'approvals',
  'notifications',
];

beforeEach(() => {
  calls = [];
  nextRow = null;
  nextRows = [];
});

function tenantCalls() {
  return calls.filter((c) => TENANT_TABLES.includes(c.table));
}

function describeCall(c: Call) {
  return `${c.op} ${c.table} filters=${JSON.stringify(c.filters)}`;
}

describe('every tenant-table read is account-scoped', () => {
  it('reads filter by the actor account', async () => {
    nextRow = { id: PROJECT_A, project_id: PROJECT_A, name: 'p', slug: 's', version: 1 };
    nextRows = [];

    await repo.listProjects(ownerA);
    await repo.getProject(ownerA, PROJECT_A);
    await repo.getProjectBySlug(ownerA, 'bookitfly');
    await repo.getProjectBySlugRaw(ownerA, 'bookitfly');
    await repo.getProjectsOverviewData(ownerA);
    await repo.listTasks(ownerA);
    await repo.getTask(ownerA, TASK_A);
    await repo.getProjectBoardTasks(ownerA, PROJECT_A);
    await repo.getTaskDetailData(ownerA, TASK_A);
    await repo.getBrain(ownerA, PROJECT_A);
    await repo.getBrainViewData(ownerA, PROJECT_A);
    await repo.getProjectActivityData(ownerA, PROJECT_A);
    await repo.getMoneyOverviewData(ownerA);
    await repo.getClientsViewData(ownerA);
    await repo.getAgentsViewData(ownerA);
    await repo.getPendingApprovalCountData(ownerA);
    await repo.getTodayDataModel(ownerA);
    await repo.getMilestone(ownerA, 'm1');
    await repo.search(ownerA, 'query');
    await repo.getContextPackData(ownerA, PROJECT_A, TASK_A);
    await repo.getOpenApprovals(ownerA);
    await repo.getSelf(workerA);
    await repo.getAssignableAgents(ownerA, PROJECT_A);
    await repo.listInbox(workerA);
    await repo.pollInboxSince(workerA, new Date(0).toISOString());

    const reads = tenantCalls().filter((c) => c.op === 'select');
    expect(reads.length).toBeGreaterThan(20);

    const unscoped = reads.filter(
      (c) => !c.filters.some(([col, val]) => col === 'account_id' && val === ACCOUNT_A),
    );
    expect(unscoped.map(describeCall)).toEqual([]);
  });

  it('writes stamp or filter by the actor account', async () => {
    nextRow = { id: PROJECT_A, project_id: PROJECT_A, account_id: ACCOUNT_A, title: 't', amount: 1, currency: 'USD', status: 'pending' };

    await repo.createTask(ownerA, { projectId: PROJECT_A, title: 'x' });
    await repo.createMilestone(ownerA, { projectId: PROJECT_A, title: 'm', amount: 5000 });
    await repo.updateMilestone(ownerA, 'm1', { status: 'paid' });
    await repo.updateTask(ownerA, TASK_A, { status: 'review' });
    await repo.addComment(ownerA, TASK_A, 'hello');
    await repo.logSession(ownerA, { projectId: PROJECT_A, summary: 's' });
    await repo.markNotificationsRead(workerA);

    const writes = tenantCalls().filter((c) => c.op === 'insert' || c.op === 'update');
    expect(writes.length).toBeGreaterThan(5);

    const leaky = writes.filter((c) => {
      if (c.op === 'update') {
        return !c.filters.some(([col, val]) => col === 'account_id' && val === ACCOUNT_A);
      }
      const rows = Array.isArray(c.payload) ? c.payload : [c.payload];
      return !rows.every((r: any) => r?.account_id === ACCOUNT_A);
    });
    expect(leaky.map(describeCall)).toEqual([]);
  });
});

describe('cross-tenant access is refused', () => {
  it('a task from another account reads as not-found, not as data', async () => {
    // The DB row exists, but the account filter means the scoped query returns nothing.
    nextRow = null;
    expect(await repo.getTask(ownerA, TASK_A)).toBeNull();
  });

  it('a task outside the actor project scope reads as not-found', async () => {
    // Same account, different project: the worker is scoped to PROJECT_A only.
    nextRow = { id: TASK_A, project_id: PROJECT_B };
    expect(await repo.getTask(workerA, TASK_A)).toBeNull();
  });

  it('resolving another account approval is refused', async () => {
    nextRow = null; // account-filtered lookup finds nothing
    await expect(repo.resolveApproval(ownerA, 'appr-1', 'approve')).rejects.toThrow('approval not found');
  });

  it('a write cannot hang a row off another account project', async () => {
    nextRow = null; // requireProject's scoped lookup misses
    await expect(
      repo.createMilestone(ownerA, { projectId: PROJECT_B, title: 'm', amount: 5000 }),
    ).rejects.toThrow('project not found');
  });

  it('a worker cannot write against a project outside its scope', async () => {
    nextRow = { id: PROJECT_B, account_id: ACCOUNT_A };
    await expect(
      repo.createTask(workerA, { projectId: PROJECT_B, title: 'x' }),
    ).rejects.toThrow('project out of actor scope');
  });
});

describe('context pack cannot pull in another project task', () => {
  it('constrains the focused task to the pack project, not just its id', async () => {
    nextRow = { id: PROJECT_A, name: 'proj' };
    await repo.getContextPackData(ownerA, PROJECT_A, TASK_A);

    const taskRead = calls.find((c) => c.table === 'tasks' && c.op === 'select');
    expect(taskRead, 'context pack should read the focused task').toBeDefined();

    // Fetching by id alone let a caller pair a project they can see with a task they
    // cannot, leaking that task's description and comments into the pack.
    expect(taskRead!.filters).toContainEqual(['project_id', PROJECT_A]);
    expect(taskRead!.filters).toContainEqual(['account_id', ACCOUNT_A]);
  });

  it('refuses a project outside the actor scope', async () => {
    await expect(repo.getContextPackData(workerA, PROJECT_B, TASK_A)).rejects.toThrow(
      'project out of actor scope',
    );
  });
});

describe('account-scoped name resolution', () => {
  it('an @mention resolves only within the mentioning account', async () => {
    nextRows = [{ id: 'agent-b', name: 'backend' }];
    await repo.resolveAgentsByName(ACCOUNT_B, ['backend']);
    const agentRead = calls.find((c) => c.table === 'agents');
    expect(agentRead!.filters).toContainEqual(['account_id', ACCOUNT_B]);
  });

  it('an agent name lookup requires an account (names are unique per account, not globally)', async () => {
    nextRow = { id: 'agent-a', name: 'project-lead', account_id: ACCOUNT_A };
    await repo.getAgentByName(ACCOUNT_A, 'project-lead');
    const agentRead = calls.find((c) => c.table === 'agents');
    expect(agentRead!.filters).toContainEqual(['account_id', ACCOUNT_A]);
    expect(agentRead!.filters).toContainEqual(['name', 'project-lead']);
  });
});
