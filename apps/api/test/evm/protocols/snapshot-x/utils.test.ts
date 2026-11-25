import { encodeAbiParameters, parseAbiParameters } from 'viem';
import { describe, expect, it, vi } from 'vitest';
import { Space } from '../../../../.checkpoint/models';
import { createConfig } from '../../../../src/evm/protocols/snapshot-x/config';
import { updateProposalValidationStrategy } from '../../../../src/evm/protocols/snapshot-x/utils';
import { EVMConfig } from '../../../../src/evm/types';

vi.mock('../../../../src/common/ipfs', () => ({
  handleVotingPowerValidationMetadata: vi.fn()
}));

const { protocolConfig } = createConfig('sep');
const strategies = [
  ['0x2c8631584474E750CEdF2Fb6A904f2e84777Aefe', '0x1234'],
  ['0x34f0AfFF5A739bBf3E285615F50e40ddAaf2A829', '0xabcd']
] as const;

describe('updateProposalValidationStrategy', () => {
  it.each([
    [
      'voting power',
      protocolConfig.propositionPowerValidationStrategyAddress,
      encodeAbiParameters(parseAbiParameters('uint256, (address,bytes)[]'), [
        100n,
        strategies
      ])
    ],
    [
      'voting power with cooldown',
      protocolConfig.propositionPowerWithCooldownValidationStrategyAddress,
      encodeAbiParameters(
        parseAbiParameters('uint256, uint256, uint256, (address,bytes)[]'),
        [604800n, 5n, 100n, strategies]
      )
    ],
    [
      'voting power v2',
      protocolConfig.propositionPowerV2ValidationStrategyAddress,
      encodeAbiParameters(
        parseAbiParameters(
          'uint256, uint256, uint256, (address,bytes)[], uint32'
        ),
        [0n, 1n, 100n, strategies, 256]
      )
    ]
  ])('should index %s threshold and strategies', async (_, address, params) => {
    const space = new Space('0x123', 'sep');

    await updateProposalValidationStrategy(
      space,
      address!,
      params,
      'ipfs://metadata',
      {} as EVMConfig,
      protocolConfig
    );

    expect(space.proposal_threshold).toBe('100');
    expect(space.voting_power_validation_strategy_strategies).toEqual(
      strategies.map(([strategy]) => strategy)
    );
    expect(space.voting_power_validation_strategy_strategies_params).toEqual(
      strategies.map(([, strategyParams]) => strategyParams)
    );
  });

  it('should index no threshold or strategies when params are malformed', async () => {
    const space = new Space('0x123', 'sep');

    await updateProposalValidationStrategy(
      space,
      protocolConfig.propositionPowerV2ValidationStrategyAddress!,
      '0x1234',
      'ipfs://metadata',
      {} as EVMConfig,
      protocolConfig
    );

    expect(space.validation_strategy_params).toBe('0x1234');
    expect(space.proposal_threshold).toBe('0');
    expect(space.voting_power_validation_strategy_strategies).toEqual([]);
  });
});
