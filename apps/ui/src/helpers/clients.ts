import { Provider, constants } from 'starknet';
import { clients as Clients } from '@snapshot-labs/sx';

const manaUrl: string = import.meta.env.VITE_MANA_URL || 'http://localhost:3000';
const ethUrl: string = import.meta.env.VITE_ETH_RPC_URL;

const starkProvider = new Provider({
  sequencer: {
    baseUrl: 'https://alpha4-2.starknet.io',
    chainId: constants.StarknetChainId.TESTNET2
  }
});

export default {
  EthereumSig: new Clients.EthereumSig({
    starkProvider,
    manaUrl,
    ethUrl
  }),
  StarkNetSig: new Clients.StarkNetSig(manaUrl)
};
