import { clients as Clients } from '@snapshot-labs/sx';

const manaUrl: string = import.meta.env.VITE_MANA_URL || 'http://localhost:3000';
const ethUrl: string = import.meta.env.VITE_ETH_RPC_URL;

export default {
  EthereumSig: new Clients.EthereumSig({
    manaUrl,
    ethUrl
  }),
  StarkNetSig: new Clients.StarkNetSig(manaUrl)
};
