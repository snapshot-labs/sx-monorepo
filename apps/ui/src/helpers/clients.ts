import { clients as Clients } from '@snapshot-labs/sx';

const url: string = import.meta.env.VITE_MANA_URL || 'http://localhost:3000';

export default {
  EthereumSig: new Clients.EthereumSig(url),
  StarkNetSig: new Clients.StarkNetSig(url)
};
