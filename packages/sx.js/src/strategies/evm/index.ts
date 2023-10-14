import createVanillaStrategy from './vanilla';
import createCompStrategy from './comp';
import createOzVotesStrategy from './ozVotes';
import createMerkleWhitelist from './merkleWhitelist';
import type { Propose, Vote, StrategyConfig, Strategy } from '../../clients/evm/types';
import type { EvmNetworkConfig } from '../../types';

export function getStrategy(address: string, networkConfig: EvmNetworkConfig): Strategy | null {
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

export async function getStrategiesParams(
  call: 'propose' | 'vote',
  strategies: StrategyConfig[],
  signerAddress: string,
  data: Propose | Vote,
  networkConfig: EvmNetworkConfig
) {
  return Promise.all(
    strategies.map(strategyConfig => {
      const strategy = getStrategy(strategyConfig.address, networkConfig);
      if (!strategy) throw new Error('Invalid strategy');

      return strategy.getParams(
        call,
        strategyConfig,
        signerAddress,
        strategyConfig.metadata || null,
        data
      );
    })
  );
}
