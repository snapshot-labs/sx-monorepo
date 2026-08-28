import { isAddress } from '@ethersproject/address';
import { Contract } from '@ethersproject/contracts';
import { StrategyWithTreasury } from '@/composables/useTreasuries';
import { getProvider } from '@/helpers/provider';
import { shortenAddress } from '@/helpers/utils';
import { Space } from '@/types';

type SafeSnapConfig = {
  address?: string;
  safes?: { network?: string | number; realityAddress?: string }[];
};

export function getSafeSnapConfig(space: Space): SafeSnapConfig | undefined {
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
export async function getSafeSnapStrategies(
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
