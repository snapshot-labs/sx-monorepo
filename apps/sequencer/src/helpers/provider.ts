import snapshot from '@snapshot-labs/snapshot.js';

// snapshot.js types getProvider per network id but does not export the two
// arms, so name them off a sample id of each kind rather than deep-importing
// its internals.
export type EvmProvider = ReturnType<typeof snapshot.utils.getProvider<'1'>>;
export type StarknetProvider = ReturnType<
  typeof snapshot.utils.getProvider<'0x534e5f4d41494e'>
>;

const BROVIDER_URL = process.env.BROVIDER_URL ?? 'https://rpc.brovider.xyz';

// Shared by every snapshot.js call that ends up talking to brovider, so the
// requests are attributed to `client=sequencer` instead of `client=none`.
export const PROVIDER_OPTIONS = {
  broviderUrl: BROVIDER_URL,
  clientName: 'sequencer'
};

// Starknet spaces reach this too (proposal creation resolves the snapshot
// block through it), so the return type stays the honest union; callers that
// need an EVM-only API narrow it themselves.
export function getProvider(
  network: string | number
): EvmProvider | StarknetProvider {
  return snapshot.utils.getProvider(network, PROVIDER_OPTIONS);
}

export function verify(
  address: string,
  sig: string | string[],
  data: any,
  network: string
) {
  return snapshot.utils.verify(address, sig, data, network, PROVIDER_OPTIONS);
}

export function getSpaceUri(id: string, network: string) {
  return snapshot.utils.getSpaceUri(id, network, PROVIDER_OPTIONS);
}
