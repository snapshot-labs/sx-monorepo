import { evmNetworks } from '@snapshot-labs/sx';
import { encodeAbiParameters, getAddress, parseAbiParameters } from 'viem';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createConfig } from './config';
import { updateProposalValidationStrategy } from './utils';
import { Space } from '../../../../.checkpoint/models';
import { handleVotingPowerValidationMetadata } from '../../../common/ipfs';
import { EVMConfig } from '../../types';

vi.mock('../../../common/ipfs', () => ({
  handleVotingPowerValidationMetadata: vi.fn()
}));

const protocol = createConfig('eth').protocolConfig;
const config = { indexerName: 'eth', snapshotXConfig: protocol } as EVMConfig;
const addresses = evmNetworks.eth.ProposalValidations;
const nested = [
  [getAddress(evmNetworks.eth.Strategies.OZVotes!), '0x123456'],
  [getAddress(evmNetworks.eth.Strategies.Whitelist!), `0x${'ab'.repeat(32)}`]
] as const;
const threshold = (1n << 255n) + 123n;
const combined = encodeAbiParameters(
  parseAbiParameters('uint256, uint256, uint256, (address,bytes)[]'),
  [604800n, 5n, threshold, nested]
);
const plain = encodeAbiParameters(
  parseAbiParameters('uint256, (address,bytes)[]'),
  [threshold, nested]
);

async function update(space: Space, address: string, params: string) {
  await updateProposalValidationStrategy(
    space,
    address,
    params,
    'ipfs://metadata',
    config,
    protocol
  );
}

beforeEach(() => vi.clearAllMocks());

describe('proposal validation indexing', () => {
  it.each([
    ['VotingPower', plain],
    ['VotingPowerWithCooldown', combined]
  ] as const)(
    'indexes %s creation and settings updates without losing precision or order',
    async (type, encoded) => {
      const space = new Space('0x123', 'eth');
      await update(space, addresses[type]!.toLowerCase(), encoded);
      expect(space.validation_strategy).toBe(getAddress(addresses[type]!));
      expect(space.validation_strategy_params).toBe(encoded);
      expect(space.proposal_threshold).toBe(threshold.toString());
      expect(space.voting_power_validation_strategy_strategies).toEqual(
        nested.map(([address]) => getAddress(address))
      );
      expect(space.voting_power_validation_strategy_strategies_params).toEqual(
        nested.map(([, params]) => params)
      );
      expect(handleVotingPowerValidationMetadata).toHaveBeenCalledWith(
        space.id,
        'ipfs://metadata',
        config
      );

      await update(
        space,
        addresses.VotingPowerWithCooldown!,
        encodeAbiParameters(
          parseAbiParameters('uint256, uint256, uint256, (address,bytes)[]'),
          [0n, 1n, 0n, [nested[1]]]
        )
      );
      expect(space.proposal_threshold).toBe('0');
      expect(space.voting_power_validation_strategy_strategies).toEqual([
        getAddress(nested[1][0])
      ]);
      expect(space.voting_power_validation_strategy_strategies_params).toEqual([
        nested[1][1]
      ]);
    }
  );

  it('clears old derived fields on unknown or malformed validators, retaining original bytes', async () => {
    const space = new Space('0x123', 'eth');
    for (const [address, params] of [
      ['0x0000000000000000000000000000000000000001', combined],
      [addresses.VotingPowerWithCooldown!, '0x1234'],
      [addresses.VotingPowerWithCooldown!, plain],
      [addresses.VotingPower!, '0x']
    ] as const) {
      await update(space, addresses.VotingPower!, plain);
      vi.clearAllMocks();
      await update(space, address, params);
      expect(space.validation_strategy_params).toBe(params);
      expect(space.proposal_threshold).toBe('0');
      expect(space.voting_power_validation_strategy_strategies).toEqual([]);
      expect(space.voting_power_validation_strategy_strategies_params).toEqual(
        []
      );
      expect(handleVotingPowerValidationMetadata).not.toHaveBeenCalled();
    }
  });

  it('does not discard valid onchain fields if metadata is unavailable', async () => {
    vi.mocked(handleVotingPowerValidationMetadata).mockRejectedValueOnce(
      new Error('unavailable')
    );
    const space = new Space('0x123', 'eth');
    await update(space, addresses.VotingPowerWithCooldown!, combined);
    expect(space.proposal_threshold).toBe(threshold.toString());
    expect(space.voting_power_validation_strategy_strategies).toHaveLength(2);
  });
});
