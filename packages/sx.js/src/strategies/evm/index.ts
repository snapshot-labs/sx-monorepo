import createVanillaStrategy from './vanilla';
import createCompStrategy from './comp';
import createWhitelistStrategy from './whitelist';
import type { Propose, Vote, StrategyConfig, Strategy } from '../../clients/evm/types';
import type { NetworkConfig } from '../../types';

export function getStrategy(address: string, networkConfig: NetworkConfig): Strategy | null {
  const strategy = networkConfig.strategies[address];
  if (!strategy) return null;

  if (strategy.type === 'vanilla') {
    return createVanillaStrategy();
  }

  if (strategy.type === 'comp') {
    return createCompStrategy();
  }

  if (strategy.type === 'whitelist') {
    return createWhitelistStrategy();
  }

  return null;
}

export async function getStrategiesParams(
  call: 'propose' | 'vote',
  strategies: StrategyConfig[],
  signerAddress: string,
  data: Propose | Vote,
  networkConfig: NetworkConfig
) {
  return Promise.all(
    strategies.map(strategyConfig => {
      const strategy = getStrategy(strategyConfig.address, networkConfig);
      if (!strategy) throw new Error('Invalid strategy');

      return strategy.getParams(call, strategyConfig, signerAddress, data);
    })
  );
}
