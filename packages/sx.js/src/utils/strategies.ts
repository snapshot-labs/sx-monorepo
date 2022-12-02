import { getStrategy } from '../strategies';
import * as utils from '../utils';
import type { Propose, Vote, ClientConfig, StrategiesAddresses } from '../types';

export async function getStrategies(
  data: Propose | Vote,
  config: ClientConfig
): Promise<StrategiesAddresses> {
  const addresses = await Promise.all(
    data.strategies.map(
      id =>
        config.starkProvider.getStorageAt(
          data.space,
          utils.encoding.getStorageVarAddress('Voting_voting_strategies_store', id.toString(16))
        ) as Promise<string>
    )
  );

  return data.strategies.map((v, i) => ({
    index: v,
    address: addresses[i]
  }));
}

export async function getStrategiesParams(
  call: 'propose' | 'vote',
  strategies: StrategiesAddresses,
  address: string,
  data: Propose | Vote,
  config: ClientConfig
) {
  return Promise.all(
    strategies.map(strategyData => {
      const strategy = getStrategy(strategyData.address);
      if (!strategy) throw new Error('Invalid strategy');

      return strategy.getParams(
        call,
        strategyData.address,
        strategyData.index,
        {
          address,
          sig: '',
          data: {
            message: data
          }
        },
        config
      );
    })
  );
}

export async function getExtraProposeCalls(
  strategies: StrategiesAddresses,
  address: string,
  data: Propose,
  config: ClientConfig
) {
  const extraCalls = await Promise.all(
    strategies.map(strategyData => {
      const strategy = getStrategy(strategyData.address);
      if (!strategy) throw new Error('Invalid strategy');

      return strategy.getExtraProposeCalls(
        address,
        strategyData.index,
        {
          address,
          sig: '',
          data: {
            message: data
          }
        },
        config
      );
    })
  );

  return extraCalls.flat();
}
