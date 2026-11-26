import { AbiCoder } from '@ethersproject/abi';
import createApeGasStrategy from './apeGas';
import createCompStrategy from './comp';
import createMerkleWhitelist from './merkleWhitelist';
import createOracleStrategy from './oracle';
import createOzVotesStrategy from './ozVotes';
import createVanillaStrategy from './vanilla';
import {
  ClientConfig,
  IndexedConfig,
  Propose,
  Strategy,
  StrategyConfig,
  Vote
} from '../../clients/evm/types';
import { EvmNetworkConfig } from '../../types';
import { VotingPowerDetailsError } from '../../utils/errors';

export function getStrategy(
  address: string,
  networkConfig: EvmNetworkConfig
): Strategy | null {
  const strategy = networkConfig.strategies[address];
  if (!strategy) return null;

  if (strategy.type === 'vanilla') {
    return createVanillaStrategy();
  }

  if (strategy.type === 'comp') {
    return createCompStrategy();
  }

  if (strategy.type === 'ozVotes') {
    return createOzVotesStrategy();
  }

  if (strategy.type === 'whitelist') {
    return createMerkleWhitelist();
  }

  if (strategy.type === 'apeGas') {
    return createApeGasStrategy();
  }

  if (strategy.type === 'oracle') {
    return createOracleStrategy();
  }

  return null;
}

export async function getStrategiesWithParams(
  call: 'propose' | 'vote',
  strategies: StrategyConfig[],
  signerAddress: string,
  data: Propose | Vote,
  config: ClientConfig
): Promise<IndexedConfig[]> {
  const results = await Promise.all(
    strategies.map(async strategyConfig => {
      const strategy = getStrategy(
        strategyConfig.address,
        config.networkConfig
      );
      if (!strategy) throw new Error('Invalid strategy');

      try {
        const params = await strategy.getParams(
          call,
          strategyConfig,
          signerAddress,
          strategyConfig.metadata || null,
          data,
          config
        );

        return {
          index: strategyConfig.index,
          params
        };
      } catch (err) {
        // Skip strategies the signer has no power with, but never drop power that failed to load
        if (err instanceof VotingPowerDetailsError) throw err;
        return null;
      }
    })
  );

  return results.filter(result => result !== null);
}

// Validations that read voting power at a recent block (VotingPowerV2) take the block before the strategies
export function encodeUserProposalValidationParams(
  userStrategies: IndexedConfig[],
  blockNumber?: number
) {
  const abiCoder = new AbiCoder();
  const strategiesType = 'tuple(int8 index, bytes params)[]';

  return blockNumber === undefined
    ? abiCoder.encode([strategiesType], [userStrategies])
    : abiCoder.encode(
        ['uint32', strategiesType],
        [blockNumber, userStrategies]
      );
}
