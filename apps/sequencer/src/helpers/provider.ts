import snapshot from '@snapshot-labs/snapshot.js';

const BROVIDER_URL = process.env.BROVIDER_URL ?? 'https://rpc.brovider.xyz';

// Shared by every snapshot.js call that ends up talking to brovider, so the
// requests are attributed to `client=sequencer` instead of `client=none`.
export const PROVIDER_OPTIONS = {
  broviderUrl: BROVIDER_URL,
  clientName: 'sequencer'
};

// Loose `any` return type matches snapshot.js: starknet networks return a
// starknet RpcProvider, not a StaticJsonRpcProvider.
export function getProvider(network: string | number): any {
  return snapshot.utils.getProvider(network, PROVIDER_OPTIONS);
}
