import { compareAddresses } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { SelectedStrategy, Space, SpaceMetadataTreasury } from '@/types';

export type StrategyWithTreasury = SelectedStrategy & {
  treasury: SpaceMetadataTreasury;
};

// Reality module address of the SafeSnap safe covering this treasury, if any.
// Matched by network: the space config only stores the module, not the Safe.
function getSafeSnapModule(
  space: Space,
  treasury: SpaceMetadataTreasury
): string | null {
  const config = space.additionalRawData?.plugins?.safeSnap as
    | {
        address?: string;
        safes?: { network?: string | number; realityAddress?: string }[];
      }
    | undefined;
  if (!config) return null;

  if (Array.isArray(config.safes)) {
    const safe = config.safes.find(
      safe => String(safe.network) === treasury.chainId && safe.realityAddress
    );
    return safe?.realityAddress ?? null;
  }

  // Legacy single-module config (mainnet only).
  if (config.address && treasury.chainId === '1') return config.address;

  return null;
}

type InputType = Space | null;
export function useTreasuries(spaceRef: ComputedRef<InputType> | InputType) {
  const strategiesWithTreasuries = computedAsync(async () => {
    const space = isRef(spaceRef) ? spaceRef.value : spaceRef;

    if (!space) return null;

    return space.treasuries
      .map(treasury => {
        const strategy = space.executors_strategies.find(strategy => {
          return (
            strategy.treasury &&
            strategy.treasury_chain &&
            treasury.address &&
            compareAddresses(strategy.treasury, treasury.address) &&
            treasury.chainId === String(strategy.treasury_chain)
          );
        });

        if (!strategy) {
          const realityAddress = getSafeSnapModule(space, treasury);

          return {
            address: realityAddress ?? treasury.address,
            destinationAddress: '0x0',
            type: realityAddress ? 'safeSnap' : 'ReadOnlyExecution',
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
