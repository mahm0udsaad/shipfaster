import { describe, it, expect } from 'vitest';
import { inScope, type ActorContext } from '../../src/lib/db/repository';

const P1 = '11111111-1111-1111-1111-111111111111';
const P2 = '22222222-2222-2222-2222-222222222222';

const owner: ActorContext = { agentId: null, actorType: 'human', role: 'owner', projectScope: [] };
const worker: ActorContext = {
  agentId: 'a', actorType: 'agent', role: 'worker', projectScope: [P1],
};

describe('project scoping', () => {
  it('owner (empty scope) sees every project', () => {
    expect(inScope(owner, P1)).toBe(true);
    expect(inScope(owner, P2)).toBe(true);
  });

  it('worker only sees scoped projects', () => {
    expect(inScope(worker, P1)).toBe(true);
    expect(inScope(worker, P2)).toBe(false);
  });
});
