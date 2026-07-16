import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the data layer so we test the tool's routing/validation, not the DB.
vi.mock('../src/lib/db/repository', () => ({
  inScope: vi.fn(() => true),
  createMilestone: vi.fn(async (_ctx, input) => ({
    id: 'm-new',
    project_id: input.projectId,
    title: input.title,
    amount: input.amount,
    currency: input.currency ?? 'USD',
    status: input.status ?? 'pending',
  })),
  updateMilestone: vi.fn(async (_ctx, id, patch) => ({
    id,
    project_id: 'p1',
    title: patch.title ?? 'Existing',
    amount: patch.amount ?? 5000,
    currency: patch.currency ?? 'USD',
    status: patch.status ?? 'pending',
  })),
  getMilestone: vi.fn(async () => ({ id: 'm1', project_id: 'p1' })),
}));

import { recordFinanceTool } from '../src/mcp/tools/recordFinance';
import * as repo from '../src/lib/db/repository';

const PROJECT = '11111111-1111-1111-1111-111111111111';
const MILESTONE = '22222222-2222-2222-2222-222222222222';
const ctx = { agentId: 'a1', actorType: 'agent', role: 'worker', projectScope: [PROJECT] } as any;

function call(raw: unknown) {
  const parsed = recordFinanceTool.input.parse(raw);
  return recordFinanceTool.handler({ ctx, input: parsed as any });
}

beforeEach(() => {
  vi.clearAllMocks();
  (repo.inScope as any).mockReturnValue(true);
  (repo.getMilestone as any).mockResolvedValue({ id: 'm1', project_id: PROJECT });
});

describe('record_finance', () => {
  it('creates a milestone from a money figure ("5k remaining to collect")', async () => {
    const res: any = await call({ project_id: PROJECT, title: 'Remaining balance', amount: 5000 });
    expect(res.created).toBe(true);
    expect(res.milestone.amount).toBe(5000);
    expect(repo.createMilestone).toHaveBeenCalledOnce();
    expect(repo.updateMilestone).not.toHaveBeenCalled();
  });

  it('passes currency and status through on create', async () => {
    const res: any = await call({
      project_id: PROJECT,
      title: 'Deposit',
      amount: 1000,
      currency: 'EGP',
      status: 'invoiced',
    });
    expect(res.milestone.currency).toBe('EGP');
    expect(res.milestone.status).toBe('invoiced');
  });

  it('updates an existing milestone when milestone_id is given', async () => {
    const res: any = await call({ project_id: PROJECT, milestone_id: MILESTONE, status: 'paid' });
    expect(res.created).toBe(false);
    expect(repo.updateMilestone).toHaveBeenCalledOnce();
    expect(repo.createMilestone).not.toHaveBeenCalled();
  });

  it('rejects an update with no fields to change (VALIDATION)', async () => {
    await expect(call({ project_id: PROJECT, milestone_id: MILESTONE })).rejects.toMatchObject({
      code: 'VALIDATION',
    });
  });

  it('requires amount when creating (VALIDATION)', async () => {
    await expect(call({ project_id: PROJECT, title: 'No amount' })).rejects.toMatchObject({
      code: 'VALIDATION',
    });
  });

  it('requires title when creating (VALIDATION)', async () => {
    await expect(call({ project_id: PROJECT, amount: 500 })).rejects.toMatchObject({
      code: 'VALIDATION',
    });
  });

  it('404s when milestone_id belongs to another project', async () => {
    (repo.getMilestone as any).mockResolvedValueOnce({ id: 'm1', project_id: 'other' });
    await expect(
      call({ project_id: PROJECT, milestone_id: MILESTONE, amount: 10 }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('forbids a project outside token scope (FORBIDDEN_FOR_ROLE)', async () => {
    (repo.inScope as any).mockReturnValue(false);
    await expect(
      call({ project_id: PROJECT, title: 'x', amount: 1 }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN_FOR_ROLE' });
  });
});
