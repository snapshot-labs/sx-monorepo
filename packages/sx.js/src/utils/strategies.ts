import { getStrategy } from '../strategies/starknet';
import { getStorageVarAddress } from '../utils/encoding';
import type {
  Propose,
  Vote,
  ClientConfig,
  StrategiesAddresses,
  StrategyConfig,
  IndexedConfig
} from '../types';

export async function getStrategies(
  data: Propose | Vote,
  config: ClientConfig
): Promise<StrategiesAddresses> {
  const addresses = await Promise.all(
    data.strategies.map(
      id =>
        config.starkProvider.getStorageAt(
          data.space,
          getStorageVarAddress('Voting_voting_strategies_store', id.index.toString(16))
        ) as Promise<string>
    )
  );

  return data.strategies.map((v, i) => ({
    index: v.index,
    address: addresses[i]
  }));
}

export async function getStrategiesWithParams(
  call: 'propose' | 'vote',
  strategies: StrategyConfig[],
  address: string,
  data: Propose | Vote,
  config: ClientConfig
) {
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
      } catch (e) {
        return null;
      }
    })
  );

  return results.filter(Boolean) as IndexedConfig[];
}

export async function getExtraProposeCalls(
  strategies: StrategiesAddresses,
  address: string,
  data: Propose,
  config: ClientConfig
) {
  const extraCalls = await Promise.all(
    strategies.map(strategyData => {
      const strategy = getStrategy(strategyData.address, config.networkConfig);
      if (!strategy) throw new Error('Invalid strategy');

      return strategy.getExtraProposeCalls(
        address,
        strategyData.index,
        {
          data
        },
        config
      );
    })
  );

  return extraCalls.flat();
}
