import {
  ClientConfig,
  IndexedConfig,
  Propose,
  StrategiesAddresses,
  StrategyConfig,
  Vote
} from '../clients/starknet/types';
import { getStrategy } from '../strategies/starknet';
import { getStorageVarAddress } from '../utils/encoding';

export async function getStrategies(
  data: Propose | Vote,
  config: ClientConfig
): Promise<StrategiesAddresses> {
  const addresses = await Promise.all(
    data.strategies.map(id =>
      config.starkProvider.getStorageAt(
        data.space,
        getStorageVarAddress(
          'Voting_voting_strategies_store',
          id.index.toString(16)
        )
      )
    )
  );

  return data.strategies.map((v, i) => ({
    index: v.index,
    address: addresses[i] as string
  }));
}

export async function getStrategiesWithParams(
  call: 'propose' | 'vote',
  strategies: StrategyConfig[],
  address: string,
  data: Propose | Vote,
  config: ClientConfig
): Promise<IndexedConfig[]> {
  const results = await Promise.all(
    strategies.map(async strategyData => {
      const strategy = getStrategy(strategyData.address, config.networkConfig);
      if (!strategy) throw new Error('Invalid strategy');

      try {
        const params = await strategy.getParams(
          call,
          address,
          strategyData.address,
          strategyData.index,
          strategyData.params,
          strategyData.metadata || null,
          {
            data
          },
          config
        );

        return {
          index: strategyData.index,
          params
        };
      } catch {
        return null;
      }
    })
  );

  return results.filter(result => result !== null);
}
