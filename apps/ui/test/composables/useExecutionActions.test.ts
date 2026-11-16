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
    api: { apiUrl: 'https://api.snapshot.box' },
    helpers: {
      getTransaction: async () => ({ finality_status: 'ACCEPTED_ON_L1' })
    }
  })
}));

vi.mock('@/composables/useActions', () => ({ useActions: () => ({}) }));

const SPACE_ID =
  '0x01e334b317fd097da7523f2dfe2f33b09f8d98362629109e56ed11022feeb029';
const PROPOSAL = {
  network: 'sn',
  state: 'executed',
  max_end: 0,
  execution_time: 0,
  execution_tx: '0x1',
  proposal_id: 1,
  space: { id: SPACE_ID }
} as unknown as Proposal;
const EXECUTION = {
  strategyType: 'EthRelayer',
  chainId: 1
} as unknown as ProposalExecution;

let scope: EffectScope;

function setup(l1Executions: { tx: string }[]) {
  query.mockResolvedValueOnce({
    data: { starknetl1executions: l1Executions }
  });
  scope = effectScope();

  return scope.run(() => useExecutionActions(PROPOSAL, EXECUTION))!;
}

describe('useExecutionActions', () => {
  afterEach(() => scope.stop());

  it('allows the L1 execution when it is not indexed yet', async () => {
    const { hasExecuteQueued, executionTx } = setup([]);

    await vi.waitFor(() => expect(hasExecuteQueued.value).toBe(true));
    expect(executionTx.value).toBe(null);

    // The API returns an empty list for a missing row on the plural query,
    // while the singular one fails with "Row not found".
    const [{ query: document, variables }] = query.mock.calls[0];
    expect(print(document)).toContain('starknetl1executions(where: {id: $id})');
    expect(variables).toEqual({ id: `${SPACE_ID}/1` });
  });

  it('links the L1 execution once it is indexed', async () => {
    const { hasExecuteQueued, executionTx } = setup([{ tx: '0x2' }]);

    await vi.waitFor(() => expect(executionTx.value).toBe('0x2'));
    expect(hasExecuteQueued.value).toBe(false);
  });
});
