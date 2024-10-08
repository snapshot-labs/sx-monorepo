import { SUPPORTED_CHAIN_IDS as ALCHEMY_SUPPORTED_CHAIN_IDS } from '@/helpers/alchemy';
import { CHAIN_IDS } from '@/helpers/constants';
import { SUPPORTED_CHAIN_IDS as OPENSEA_SUPPORTED_CHAIN_IDS } from '@/helpers/opensea';
import { getIsOsnapEnabled } from '@/helpers/osnap';
import { compareAddresses } from '@/helpers/utils';
import { getNetwork, offchainNetworks } from '@/networks';
import { SelectedStrategy, Space, SpaceMetadataTreasury } from '@/types';

export type StrategyWithTreasury = SelectedStrategy & {
  treasury: SpaceMetadataTreasury;
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
            CHAIN_IDS[treasury.network] as number,
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
            treasury
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
            treasury
          };
        }

        return {
          address: strategy.address,
          destinationAddress: strategy.destination_address,
          type: strategy.type,
          treasury
        };
      })
      .filter(strategy => {
        // Editor will only show strategies that are:
        // - Supported by the Alchemy API
        // - Supported by the OpenSea API
        // - Have network
        // in the future we can make it more granular
        if (strategy.treasury.chainId) {
          if (
            !ALCHEMY_SUPPORTED_CHAIN_IDS.includes(
              strategy.treasury.chainId as any
            )
          ) {
            return false;
          }

          if (
            !OPENSEA_SUPPORTED_CHAIN_IDS.includes(
              strategy.treasury.chainId as any
            )
          ) {
            return false;
          }
        }

        return (
          strategy &&
          strategy.treasury.network &&
          getNetwork(space.network).helpers.isExecutorSupported(strategy.type)
        );
      }) as StrategyWithTreasury[];
  }, null);

  return {
    strategiesWithTreasuries
  };
}
