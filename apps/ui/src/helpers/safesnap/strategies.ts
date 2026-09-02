import { isAddress } from '@ethersproject/address';
import { Contract } from '@ethersproject/contracts';
import { StrategyWithTreasury } from '@/composables/useTreasuries';
import { getProvider } from '@/helpers/provider';
import { shortenAddress } from '@/helpers/utils';
import { Space } from '@/types';

type SafeSnapConfig = {
  address?: string;
  safes?: {
    network?: string | number;
    realityAddress?: string;
    umaAddress?: string;
  }[];
};

export function getSafeSnapConfig(space: Space): SafeSnapConfig | undefined {
  return space.additionalRawData?.plugins?.safeSnap as
    | SafeSnapConfig
    | undefined;
}

// Returns null rather than falling back to the module address: presenting a
// module as its own Safe drives the balance and NFT pickers off the wrong
// account and encodes it as the `from` of a transfer. v1 does not substitute
// either — its `getModuleDetailsReality` lets the failure propagate.
async function getModuleSafe(
  chainId: string,
  module: string
): Promise<string | null> {
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

      return null;
    }
  }
}

// v1's `validateUmaModule` routes a proposal to UMA whenever `umaAddress`
// answers `rules()`, never reading `realityAddress` — so a module v1 would
// assert through UMA must not be offered. Fails open: ethers reports
// `CALL_EXCEPTION` for a revert, a dead host and an unroutable chain alike, so
// failing closed would withhold far more than it fixes; an unreachable chain
// is already caught by getModuleSafe.
async function isLiveUmaModule(chainId: string, address?: string) {
  if (!address || !isAddress(address)) return false;

  const contract = new Contract(
    address,
    ['function rules() view returns (string)'],
    getProvider(Number(chainId))
  );

  try {
    await contract.rules();

    return true;
  } catch {
    return false;
  }
}

export async function getSafeSnapStrategies(
  space: Space
): Promise<StrategyWithTreasury[]> {
  const config = getSafeSnapConfig(space);
  if (!config) return [];

  const safes = Array.isArray(config.safes)
    ? config.safes.filter(
        safe =>
          safe?.realityAddress &&
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

  const resolved = await Promise.all(
    safes.map(async safe => {
      const chainId = String(safe.network ?? space.snapshot_chain_id ?? '1');
      const realityAddress = safe.realityAddress as string;
      const [wallet, isUma] = await Promise.all([
        getModuleSafe(chainId, realityAddress),
        isLiveUmaModule(chainId, safe.umaAddress)
      ]);

      return wallet && !isUma ? { chainId, realityAddress, wallet } : null;
    })
  );

  const modules = resolved.filter(
    (module): module is NonNullable<typeof module> => module !== null
  );

  return modules.map(({ chainId, realityAddress, wallet }) => ({
    address: realityAddress,
    destinationAddress: '0x0',
    type: 'safeSnap',
    treasury: {
      // Count resolved modules, not configured ones — a dropped module must
      // not leave the survivor named ambiguously.
      name:
        modules.length > 1 ? `SafeSnap ${shortenAddress(wallet)}` : 'SafeSnap',
      address: wallet,
      chainId
    }
  }));
}
