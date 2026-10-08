import { AbiCoder } from '@ethersproject/abi';
import { evmNetworks } from '@snapshot-labs/sx';
import { describe, expect, it, vi } from 'vitest';
import { ref, toValue } from 'vue';
import { Space } from '@/types';
import {
  PropositionPowerItem,
  usePropositionPowerQuery
} from './propositionPower';

const { getVotingPower } = vi.hoisted(() => ({ getVotingPower: vi.fn() }));
vi.mock('@tanstack/vue-query', () => ({
  useQuery: (options: unknown) => options
}));
vi.mock('@/networks', () => ({
  getNetwork: () => ({ actions: { getVotingPower } })
}));
vi.mock('@/composables/useWeb3', () => ({
  useWeb3: () => ({
    web3: { value: { account: '0x0000000000000000000000000000000000000001' } }
  })
}));

function query(space: Space) {
  return (
    usePropositionPowerQuery(space) as unknown as {
      queryFn: () => Promise<PropositionPowerItem>;
    }
  ).queryFn();
}

const space = {
  id: 'test',
  network: 'eth',
  protocol: 'snapshot-x',
  validation_strategy: evmNetworks.eth.ProposalValidations.VotingPower,
  validation_strategy_params: new AbiCoder().encode(
    ['uint256', 'tuple(address addr, bytes params)[]'],
    ['9007199254740993', []]
  ),
  proposal_threshold: '9007199254740993',
  voting_power_symbol: 'VP',
  voting_power_validation_strategy_strategies: [],
  voting_power_validation_strategy_strategies_params: [],
  voting_power_validation_strategies_parsed_metadata: []
} as unknown as Space;

describe('proposition power', () => {
  it('changes its reactive cache identity when indexed validation settings change', () => {
    const current = ref(space);
    const options = usePropositionPowerQuery(current) as unknown as {
      queryKey: unknown[];
    };
    const key = () =>
      JSON.stringify(
        options.queryKey.map(value =>
          typeof value === 'function' ? value() : toValue(value)
        )
      );
    const before = key();
    current.value = { ...space, proposal_threshold: '0' };
    expect(key()).not.toBe(before);
    const thresholdKey = key();
    current.value = {
      ...current.value,
      voting_power_validation_strategy_strategies_params: ['0x00']
    };
    expect(key()).not.toBe(thresholdKey);
  });
  it('compares exact raw integers at the threshold, even beyond Number precision', async () => {
    getVotingPower.mockResolvedValue([{ value: 9007199254740993n }]);
    expect((await query(space)).canPropose).toBe(true);
    getVotingPower.mockResolvedValue([{ value: 9007199254740992n }]);
    expect((await query(space)).canPropose).toBe(false);
    getVotingPower.mockResolvedValue([
      { value: 9007199254740992n },
      { value: 1n }
    ]);
    expect((await query(space)).canPropose).toBe(true);
  });

  it('does not treat malformed combined validation as a zero threshold', async () => {
    getVotingPower.mockClear();
    expect(
      (
        await query({
          ...space,
          validation_strategy:
            evmNetworks.eth.ProposalValidations.VotingPowerWithCooldown!,
          validation_strategy_params: '0x',
          proposal_threshold: '0'
        })
      ).canPropose
    ).toBe(false);
    expect(getVotingPower).not.toHaveBeenCalled();
  });
});
