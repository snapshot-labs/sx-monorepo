import { StaticJsonRpcProvider } from '@ethersproject/providers';
import snapshot from '@snapshot-labs/snapshot.js';
import networks from '@snapshot-labs/snapshot.js/src/networks.json';

export const BROVIDER_URL =
  process.env.BROVIDER_URL ?? 'https://rpc.brovider.xyz';
const providers = new Map<string, StaticJsonRpcProvider>();

export function getProvider(network: string | number): StaticJsonRpcProvider {
  // snapshot.js builds the RPC URL without a query string, so EVM providers are
  // created locally to append ?client=sequencer. Starknet networks need
  // snapshot.js (RpcProvider + broviderId mapping) and keep going through it.
  if (
    (networks as Record<string, { starknet?: boolean }>)[String(network)]
      ?.starknet
  ) {
    return snapshot.utils.getProvider(network, { broviderUrl: BROVIDER_URL });
  }

  const key = String(network);
  let provider = providers.get(key);
  if (!provider) {
    provider = new StaticJsonRpcProvider(
      { url: `${BROVIDER_URL}/${key}?client=sequencer`, timeout: 25000 },
      Number(network)
    );
    providers.set(key, provider);
  }
  return provider;
}
