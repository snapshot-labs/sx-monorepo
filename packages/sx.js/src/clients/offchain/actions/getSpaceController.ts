import { Provider } from '@ethersproject/providers';
import {
  ENSChainId,
  EVM_EMPTY_ADDRESS,
  getEnsSpaceController
} from '../../utils/ens';
import {
  getShibariumDomainOwner,
  getUnstoppableDomainOwner
} from '../../utils/domains';

export type NetworkID = 's' | 's-tn';

export type GetSpaceControllerParameters = {
  /** The space ID (domain name) to fetch the controller for */
  spaceId: string;
  /** The network ID (s for mainnet, s-tn for testnet) */
  networkId: NetworkID;
  /** Provider for the appropriate chain (ETH mainnet/sepolia, Shibarium, or Sonic) */
  provider: Provider;
};

export type GetSpaceControllerReturnType = string;

const CHAIN_MAPPING = {
  ens: {
    s: 1 as ENSChainId,
    's-tn': 11155111 as ENSChainId
  },
  shibarium: {
    s: 109,
    's-tn': 157
  },
  sonic: {
    s: 146
  }
};

/**
 * Gets the controller address for an offchain Snapshot space.
 *
 * This function resolves the space controller based on the domain type:
 * - For .shib domains: Returns the Shibarium domain owner
 * - For .sonic domains: Returns the Unstoppable Domains owner on Sonic
 * - For ENS domains: Returns the address from the 'snapshot' text record or the ENS owner
 *
 * @param parameters - {@link GetSpaceControllerParameters}
 * @returns The controller address for the space {@link GetSpaceControllerReturnType}
 *
 * @example
 * ```typescript
 * import { getSpaceController } from '@snapshot-labs/sx';
 * import { providers } from '@ethersproject/providers';
 *
 * const provider = new providers.JsonRpcProvider('https://rpc.ankr.com/eth');
 *
 * const controller = await getSpaceController({
 *   spaceId: 'vitalik.eth',
 *   networkId: 's',
 *   provider
 * });
 * // Returns '0x...'
 * ```
 */
export async function getSpaceController(
  parameters: GetSpaceControllerParameters
): Promise<GetSpaceControllerReturnType> {
  const { spaceId, networkId, provider } = parameters;

  if (spaceId.endsWith('.shib')) {
    const chainId = CHAIN_MAPPING.shibarium[networkId];
    if (!chainId) {
      throw new Error(`Shibarium not supported on network ${networkId}`);
    }
    
    const owner = await getShibariumDomainOwner(provider, spaceId);
    return owner || EVM_EMPTY_ADDRESS;
  }

  if (spaceId.endsWith('.sonic')) {
    const chainId = CHAIN_MAPPING.sonic[networkId as 's'];
    if (!chainId) {
      throw new Error(`Sonic not supported on network ${networkId}`);
    }
    
    return getUnstoppableDomainOwner(provider, spaceId);
  }

  // Default to ENS resolution
  const chainId = CHAIN_MAPPING.ens[networkId];
  return getEnsSpaceController(provider, spaceId, chainId);
}
