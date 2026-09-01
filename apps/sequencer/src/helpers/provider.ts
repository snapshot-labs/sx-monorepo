import snapshot from '@snapshot-labs/snapshot.js';

// snapshot.js types getProvider per network id but does not export the two
// arms, so name them off a sample id of each kind rather than deep-importing
// its internals.
export type EvmProvider = ReturnType<typeof snapshot.utils.getProvider<'1'>>;
export type StarknetProvider = ReturnType<
  typeof snapshot.utils.getProvider<'0x534e5f4d41494e'>
>;

const BROVIDER_URL = process.env.BROVIDER_URL ?? 'https://rpc.brovider.xyz';

export const PROVIDER_OPTIONS = {
  broviderUrl: BROVIDER_URL,
  clientName: 'sequencer'
};

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

export function getSpaceController(space: string, network: string) {
  return snapshot.utils.getSpaceController(space, network, PROVIDER_OPTIONS);
}
