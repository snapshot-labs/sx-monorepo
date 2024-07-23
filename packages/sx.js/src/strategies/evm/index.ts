import type {
  IndexedConfig,
  Propose,
  Strategy,
  StrategyConfig,
  Vote
} from '../../clients/evm/types';
import type { EvmNetworkConfig } from '../../types';
import createCompStrategy from './comp';
import createMerkleWhitelist from './merkleWhitelist';
import createOzVotesStrategy from './ozVotes';
import createVanillaStrategy from './vanilla';

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

  return null;
}

export async function getStrategiesWithParams(
  call: 'propose' | 'vote',
  strategies: StrategyConfig[],
  signerAddress: string,
  data: Propose | Vote,
  networkConfig: EvmNetworkConfig
) {
  const results = await Promise.all(
    strategies.map(async strategyConfig => {
      const strategy = getStrategy(strategyConfig.address, networkConfig);
      if (!strategy) throw new Error('Invalid strategy');

      try {
        const params = await strategy.getParams(
          call,
          strategyConfig,
          signerAddress,
          strategyConfig.metadata || null,
          data
        );

        return {
          index: strategyConfig.index,
          params
        };
      } catch (e) {
        return null;
      }
    })
  );

  return results.filter(Boolean) as IndexedConfig[];
}
