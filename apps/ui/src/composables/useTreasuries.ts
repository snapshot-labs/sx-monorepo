import { isAddress } from '@ethersproject/address';
import { Contract } from '@ethersproject/contracts';
import { getProvider } from '@/helpers/provider';
import { compareAddresses, shortenAddress } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { SelectedStrategy, Space, SpaceMetadataTreasury } from '@/types';

export type StrategyWithTreasury = SelectedStrategy & {
  treasury: SpaceMetadataTreasury;
};

type SafeSnapConfig = {
  address?: string;
  safes?: { network?: string | number; realityAddress?: string }[];
};

function getSafeSnapConfig(space: Space): SafeSnapConfig | undefined {
  return space.additionalRawData?.plugins?.safeSnap as
    | SafeSnapConfig
    | undefined;
}

// Resolve the Gnosis Safe controlled by a Zodiac module (the SafeSnap config
// only stores the module). Falls back to the module address if unavailable.
async function getModuleSafe(chainId: string, module: string): Promise<string> {
  const contract = new Contract(
    module,
    [
      'function avatar() view returns (address)',
      'function executor() view returns (address)'
    ],
    getProvider(Number(chainId))
  );

  try {
    return await contract.avatar();
  } catch (avatarErr) {
    try {
      // Older Zodiac Dao Modules expose `executor` instead of `avatar`.
      return await contract.executor();
    } catch (executorErr) {
      console.error(
        `getModuleSafe: failed to resolve Safe for module ${module} on chain ${chainId}`,
        avatarErr,
        executorErr
      );

      return module;
    }
  }
}

// SafeSnap execution strategies, read straight from the space's SafeSnap
// config (independent of treasuries, like the Snapshot v1 plugin).
async function getSafeSnapStrategies(
  space: Space
): Promise<StrategyWithTreasury[]> {
  const config = getSafeSnapConfig(space);
  if (!config) return [];

  const safes = Array.isArray(config.safes)
    ? config.safes.filter(
        safe =>
          safe.realityAddress &&
          isAddress(safe.realityAddress) &&
          (safe.network === undefined || /^\d+$/.test(String(safe.network)))
      )
    : config.address && isAddress(config.address)
      ? [
          {
            network: space.snapshot_chain_id ?? '1',
            realityAddress: config.address
          }
        ]
      : [];

  return Promise.all(
    safes.map(async safe => {
      const chainId = String(safe.network ?? '1');
      const realityAddress = safe.realityAddress as string;
      const wallet = await getModuleSafe(chainId, realityAddress);
      // The config carries no name, so a space with several modules would
      // otherwise render identical entries; name them after their Safe.
      const name =
        safes.length > 1 ? `SafeSnap ${shortenAddress(wallet)}` : 'SafeSnap';

      return {
        address: realityAddress,
        destinationAddress: '0x0',
        type: 'safeSnap',
        treasury: { name, address: wallet, chainId }
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
          !safeSnapStrategies.some(
            safeSnap =>
              compareAddresses(
                safeSnap.treasury.address,
                strategy.treasury.address
              ) && safeSnap.treasury.chainId === strategy.treasury.chainId
          )
      ),
      ...safeSnapStrategies
    ];

    return strategies.filter(strategy =>
      getNetwork(space.network).helpers.isExecutorSupported(strategy.type)
    ) as StrategyWithTreasury[];
  }, null);

  // Only a space with a SafeSnap config waits on an on-chain call before
  // strategiesWithTreasuries resolves; everything else settles on the next
  // tick, so callers should not gate on the pending state for those.
  const hasSafeSnapConfig = computed(() => {
    const space = isRef(spaceRef) ? spaceRef.value : spaceRef;

    return !!space && !!getSafeSnapConfig(space);
  });

  return {
    strategiesWithTreasuries,
    hasSafeSnapConfig
  };
}
