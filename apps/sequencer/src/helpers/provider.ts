import snapshot from '@snapshot-labs/snapshot.js';

const BROVIDER_URL = process.env.BROVIDER_URL ?? 'https://rpc.brovider.xyz';

// Shared by every snapshot.js call that ends up talking to brovider, so the
// requests are attributed to `client=sequencer` instead of `client=none`.
export const PROVIDER_OPTIONS = {
  broviderUrl: BROVIDER_URL,
  clientName: 'sequencer'
};

// Generic so snapshot.js can resolve the return type per network: starknet
// ones give an RpcProvider, everything else a StaticJsonRpcProvider.
export function getProvider<T extends string | number>(network: T) {
  return snapshot.utils.getProvider(network, PROVIDER_OPTIONS);
}
