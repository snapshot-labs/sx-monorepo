import { Contract } from '@ethersproject/contracts';
import { getProvider } from '@/helpers/provider';
import { compareAddresses } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { SelectedStrategy, Space, SpaceMetadataTreasury } from '@/types';

export type StrategyWithTreasury = SelectedStrategy & {
  treasury: SpaceMetadataTreasury;
};

// Resolve the Gnosis Safe controlled by a Zodiac module (the SafeSnap config
// only stores the module). Falls back to the module address if unavailable.
async function getModuleSafe(chainId: string, module: string): Promise<string> {
  try {
    const contract = new Contract(
      module,
      ['function avatar() view returns (address)'],
      getProvider(Number(chainId))
    );
    return await contract.avatar();
  } catch {
    return module;
  }
}

// SafeSnap execution strategies, read straight from the space's SafeSnap
// config (independent of treasuries, like the Snapshot v1 plugin).
async function getSafeSnapStrategies(
  space: Space
): Promise<StrategyWithTreasury[]> {
  const config = space.additionalRawData?.plugins?.safeSnap as
    | {
        address?: string;
        safes?: { network?: string | number; realityAddress?: string }[];
      }
    | undefined;
  if (!config) return [];

  const safes = config.safes
    ? config.safes.filter(safe => safe.realityAddress)
    : config.address
      ? [{ network: '1', realityAddress: config.address }]
      : [];

  return Promise.all(
    safes.map(async safe => {
      const chainId = String(safe.network ?? '1');
      const realityAddress = safe.realityAddress as string;
      const wallet = await getModuleSafe(chainId, realityAddress);

      return {
        address: realityAddress,
        destinationAddress: '0x0',
        type: 'safeSnap',
        treasury: { name: 'SafeSnap', address: wallet, chainId }
      };
    })
  );
}

type InputType = Space | null;
export function useTreasuries(spaceRef: ComputedRef<InputType> | InputType) {
  const strategiesWithTreasuries = computedAsync(async () => {
    const space = isRef(spaceRef) ? spaceRef.value : spaceRef;

    if (!space) return null;

    const treasuryStrategies = space.treasuries.map(treasury => {
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
    });

    const safeSnapStrategies = await getSafeSnapStrategies(space);

    // A SafeSnap module supersedes a plain treasury for the same Safe.
    const strategies = [
      ...treasuryStrategies.filter(
        strategy =>
          !safeSnapStrategies.some(safeSnap =>
            compareAddresses(
              safeSnap.treasury.address,
              strategy.treasury.address
            )
          )
      ),
      ...safeSnapStrategies
    ];

    return strategies.filter(strategy =>
      getNetwork(space.network).helpers.isExecutorSupported(strategy.type)
    ) as StrategyWithTreasury[];
  }, null);

  return {
    strategiesWithTreasuries
  };
}
