import { memoize } from '@/helpers/utils';
import { resolveName as resolveEnsName } from '@/helpers/ens';
import { NetworkID } from '@/types';
import { offchainNetworks } from '@/networks';

const ENS_CHAIN_ID = 1;
const ENS_NETWORK_ID = 'eth';

type ResolvedName = {
  networkId: NetworkID;
  address: string;
};

function createResolver() {
  const cache = new Map<string, ResolvedName | null>();

  function resolveStatic(id: string): ResolvedName | null {
    const parts = id.split(':');

    return {
      networkId: parts[0] as NetworkID,
      address: parts[1]
    };
  }

  async function resolveEns(id: string): Promise<ResolvedName | null> {
    const resolvedAddress = await resolveEnsName(id, ENS_CHAIN_ID);

    if (!resolvedAddress) {
      return null;
    }

    return {
      networkId: ENS_NETWORK_ID,
      address: resolvedAddress.toLocaleLowerCase()
    };
  }

  async function resolveName(id: string) {
    if (cache.has(id)) {
      return cache.get(id);
    }

    const shouldUseEns =
      id.endsWith('.eth') && !offchainNetworks.includes(id.split(':')[0] as NetworkID);

    const resolved = shouldUseEns ? await resolveEns(id) : resolveStatic(id);
    if (resolved) {
      cache.set(id, resolved);
    }

    return resolved;
  }

  return {
    resolveName: memoize(resolveName)
  };
}

export const resolver = createResolver();
