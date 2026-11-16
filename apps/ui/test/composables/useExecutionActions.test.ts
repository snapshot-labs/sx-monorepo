import { print } from 'graphql';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EffectScope, effectScope } from 'vue';
import { useExecutionActions } from '@/composables/useExecutionActions';
import { Proposal, ProposalExecution } from '@/types';

const query = vi.fn();

vi.mock('@apollo/client/core', () => ({
  ApolloClient: class {
    query = query;
  },
  InMemoryCache: class {},
  createHttpLink: () => null
}));
vi.mock('@/networks', () => ({
  getNetwork: () => ({
    baseNetworkId: 'eth',
    api: {},
    helpers: {
      getTransaction: async () => ({ finality_status: 'ACCEPTED_ON_L1' })
    }
  })
}));
vi.mock('@/composables/useActions', () => ({ useActions: () => ({}) }));

const PROPOSAL = {
  state: 'executed',
  execution_tx: '0x1',
  proposal_id: 1,
  space: { id: '0x2' }
} as unknown as Proposal;
const EXECUTION = { strategyType: 'EthRelayer' } as ProposalExecution;

let scope: EffectScope;

function setup(l1Executions: { tx: string }[]) {
  query.mockResolvedValueOnce({ data: { starknetl1executions: l1Executions } });
  scope = effectScope();

  return scope.run(() => useExecutionActions(PROPOSAL, EXECUTION))!;
}

describe('useExecutionActions', () => {
  afterEach(() => scope.stop());

  it('allows the L1 execution until it is indexed', async () => {
    const { hasExecuteQueued, executionTx } = setup([]);

    await vi.waitFor(() => expect(hasExecuteQueued.value).toBe(true));
    expect(executionTx.value).toBeNull();
    // The plural query returns [] for a missing row, the singular one fails
    const [{ query: document, variables }] = query.mock.calls[0];
    expect(print(document)).toContain('starknetl1executions(where: {id: $id})');
    expect(variables).toEqual({ id: '0x2/1' });
  });

  it('links the L1 execution once it is indexed', async () => {
    const { hasExecuteQueued, executionTx } = setup([{ tx: '0x3' }]);

    await vi.waitFor(() => expect(executionTx.value).toBe('0x3'));
    expect(hasExecuteQueued.value).toBe(false);
  });
});
