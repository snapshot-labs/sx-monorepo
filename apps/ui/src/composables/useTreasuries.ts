import { CHAIN_IDS } from '@/helpers/constants';
import { getIsOsnapEnabled } from '@/helpers/osnap';
import { compareAddresses } from '@/helpers/utils';
import { getNetwork, offchainNetworks } from '@/networks';
import {
  RequiredProperty,
  SelectedStrategy,
  Space,
  SpaceMetadataTreasury
} from '@/types';

export type StrategyWithTreasury = SelectedStrategy & {
  treasury: RequiredProperty<SpaceMetadataTreasury>;
};

type InputType = Space | null;
export function useTreasuries(spaceRef: ComputedRef<InputType> | InputType) {
  const strategiesWithTreasuries = computedAsync(async () => {
    const space = isRef(spaceRef) ? spaceRef.value : spaceRef;

    if (!space) return null;

    let oSnapSupportPerTreasury: boolean[] | null = null;
    if (offchainNetworks.includes(space.network)) {
      oSnapSupportPerTreasury = await Promise.all(
        space.treasuries.map(async treasury => {
          if (
            !treasury.network ||
            !treasury.address ||
            !CHAIN_IDS[treasury.network]
          ) {
            return false;
          }

          return getIsOsnapEnabled(
            CHAIN_IDS[treasury.network],
            treasury.address
          );
        })
      );
    }

    return space.treasuries
      .map((treasury, i) => {
        if (
          offchainNetworks.includes(space.network) &&
          oSnapSupportPerTreasury &&
          oSnapSupportPerTreasury[i]
        ) {
          return {
            address: treasury.address,
            destinationAddress: null,
            type: 'oSnap',
            treasury: treasury as RequiredProperty<SpaceMetadataTreasury>
          };
        }

        const strategy = space.executors_strategies.find(strategy => {
          return (
            strategy.treasury &&
            strategy.treasury_chain &&
            treasury.address &&
            treasury.network &&
            compareAddresses(strategy.treasury, treasury.address) &&
            CHAIN_IDS[treasury.network] === strategy.treasury_chain
          );
        });

        if (!strategy) {
          return {
            address: treasury.address,
            destinationAddress: '0x0',
            type: 'ReadOnlyExecution',
            treasury: treasury as RequiredProperty<SpaceMetadataTreasury>
          };
        }

        return {
          address: strategy.address,
          destinationAddress: strategy.destination_address,
          type: strategy.type,
          treasury: treasury as RequiredProperty<SpaceMetadataTreasury>
        };
      })
      .filter(
        strategy =>
          strategy &&
          getNetwork(space.network).helpers.isExecutorSupported(strategy.type)
      ) as StrategyWithTreasury[];
  }, null);

  return {
    strategiesWithTreasuries
  };
}
