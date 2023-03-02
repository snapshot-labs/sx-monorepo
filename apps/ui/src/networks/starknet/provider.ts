import { Provider, constants } from 'starknet';

export function createProvider() {
  return new Provider({
    sequencer: {
      baseUrl: 'https://alpha4-2.starknet.io',
      chainId: constants.StarknetChainId.SN_GOERLI2
    }
  });
}
