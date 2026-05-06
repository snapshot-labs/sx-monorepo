import { evmNetworks as evmConfigs } from '@snapshot-labs/sx';
import { getProvider } from '@/helpers/provider';
import { getNetwork } from '@/networks';
import { NetworkID } from '@/types';

const cache = new Map<string, number>();
const cacheKey = (networkId: NetworkID, block: number) =>
  `${networkId}:${block}`;

function isEvmNetworkId(
  networkId: NetworkID
): networkId is keyof typeof evmConfigs {
  return networkId in evmConfigs;
}

// Resolve block numbers to timestamps. Past blocks use real on-chain values;
// future blocks are estimated from current + blockTime. Failures are silently
// omitted so callers fall back to the API estimate.
export async function fetchBlockTimestamps(
  networkId: NetworkID,
  blockNumbers: (number | null)[],
  current: number
): Promise<Record<number, number>> {
  const result: Record<number, number> = {};
  if (!isEvmNetworkId(networkId) || !current) return result;

  const blockTime = evmConfigs[networkId].Meta.blockTime;
  const nowTs = Math.floor(Date.now() / 1000);
  const pastBlocks = new Set<number>();

  for (const block of blockNumbers) {
    if (block === null) continue;
    if (block > current) {
      result[block] = Math.round(nowTs + (block - current) * blockTime);
      continue;
    }
    const cached = cache.get(cacheKey(networkId, block));
    if (cached) {
      result[block] = cached;
    } else {
      pastBlocks.add(block);
    }
  }

  if (pastBlocks.size === 0) return result;

  const provider = getProvider(getNetwork(networkId).currentChainId);
  await Promise.all(
    [...pastBlocks].map(async block => {
      try {
        const data = await provider.getBlock(block);
        if (data) {
          result[block] = data.timestamp;
          cache.set(cacheKey(networkId, block), data.timestamp);
        }
      } catch {}
    })
  );

  return result;
}
