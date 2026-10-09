import { JsonRpcProvider } from '@ethersproject/providers';
import { evmNetworks, getEvmStrategy } from '@snapshot-labs/sx';
import * as sdk from '@snapshot-labs/sx';
import { describe, expect, it, vi } from 'vitest';
import { NetworkHelpers } from '@/networks/types';
import { createActions } from './actions';

vi.mock('@/networks', () => ({ getNetwork: vi.fn() }));
vi.mock('@snapshot-labs/sx', async importOriginal => {
  const original = await importOriginal<typeof sdk>();
  return { ...original, getEvmStrategy: vi.fn(original.getEvmStrategy) };
});

const actions = createActions(
  new JsonRpcProvider(),
  {} as NetworkHelpers,
  'eth'
);
const voter = '0x0000000000000000000000000000000000000001';

describe('proposal power metadata', () => {
  it('allows metadata-independent power queries when optional metadata is absent', async () => {
    const getVotingPower = vi.fn(async () => 21n);
    vi.mocked(getEvmStrategy).mockReturnValueOnce({
      type: 'ozVotes',
      getParams: async () => '0x00',
      getVotingPower
    });
    const power = await actions.getVotingPower(
      'space',
      [evmNetworks.eth.Strategies.OZVotes!],
      [voter],
      [],
      voter,
      { at: null, chainId: 1 }
    );
    expect(getVotingPower).toHaveBeenCalledWith(
      expect.any(String),
      voter,
      null,
      null,
      voter,
      expect.anything()
    );
    expect(power[0]).toMatchObject({
      value: 21n,
      cumulativeDecimals: 0,
      displayDecimals: 0
    });
  });

  it('still refuses whitelist power without its required metadata', async () => {
    await expect(
      actions.getVotingPower(
        'space',
        [evmNetworks.eth.Strategies.Whitelist!],
        [`0x${'00'.repeat(32)}`],
        [],
        voter,
        { at: null, chainId: 1 }
      )
    ).rejects.toThrow('Missing tree');
  });
});
