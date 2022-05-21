import { Clients } from '@snapshot-labs/sx';

// @ts-ignore
const url: string = import.meta.env.VITE_MANA_URL || 'http://localhost:3000';
const clients: any = {};
clients.EthereumSig = new Clients.EthereumSig(url);
clients.StarkNetSig = new Clients.StarkNetSig(url);

export default clients;
