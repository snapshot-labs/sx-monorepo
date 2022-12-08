import { Provider, constants } from 'starknet';

export const starkProvider = new Provider({
  sequencer: {
    baseUrl: 'https://alpha4-2.starknet.io',
    chainId: constants.StarknetChainId.TESTNET2
  }
});
