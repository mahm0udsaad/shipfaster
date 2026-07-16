import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/lib/db/repository', async () => {
  const actual = await vi.importActual<any>('../src/lib/db/repository');
  return {
    ...actual, // keep the real slugify
    getProjectBySlugRaw: vi.fn(async () => null),
    createProject: vi.fn(async (_ctx, input) => ({
      id: 'p-new',
      name: input.name,
      slug: input.slug,
      client_id: input.clientName ? 'c1' : null,
      clients: input.clientName ? { id: 'c1', name: input.clientName } : null,
    })),
  };
});

import { createProjectTool } from '../src/mcp/tools/createProject';
import * as repo from '../src/lib/db/repository';

const ctx = { agentId: null, actorType: 'human', role: 'owner', projectScope: [] } as any;

function call(raw: unknown) {
  const parsed = createProjectTool.input.parse(raw);
  return createProjectTool.handler({ ctx, input: parsed as any });
}

beforeEach(() => {
  vi.clearAllMocks();
  (repo.getProjectBySlugRaw as any).mockResolvedValue(null);
});

describe('create_project', () => {
  it('creates a project and derives a slug from the name', async () => {
    const res: any = await call({ name: 'Mazaya design', client_name: 'Mazaya' });
    expect(res.created).toBe(true);
    expect(res.project.slug).toBe('mazaya-design');
    expect(repo.createProject).toHaveBeenCalledWith(ctx, expect.objectContaining({ slug: 'mazaya-design', clientName: 'Mazaya' }));
  });

  it('honors an explicit slug (slugified)', async () => {
    await call({ name: 'Mazaya design', slug: 'Mazaya Q3' });
    expect(repo.createProject).toHaveBeenCalledWith(ctx, expect.objectContaining({ slug: 'mazaya-q3' }));
  });

  it('rejects a slug that is already taken (VALIDATION)', async () => {
    (repo.getProjectBySlugRaw as any).mockResolvedValueOnce({ id: 'x', slug: 'mazaya-design' });
    await expect(call({ name: 'Mazaya design' })).rejects.toMatchObject({ code: 'VALIDATION' });
    expect(repo.createProject).not.toHaveBeenCalled();
  });

  it('rejects a name that slugifies to nothing (VALIDATION)', async () => {
    await expect(call({ name: '!!!' })).rejects.toMatchObject({ code: 'VALIDATION' });
  });

  it('is not callable by a worker role', () => {
    expect(createProjectTool.allowedRoles).not.toContain('worker');
    expect(createProjectTool.allowedRoles).toEqual(expect.arrayContaining(['owner', 'project_lead']));
  });
});
