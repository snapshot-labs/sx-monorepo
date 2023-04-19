import { Wallet } from '@ethersproject/wallet';
import { JsonRpcProvider } from '@ethersproject/providers';

const ethPrivkey = process.env.ETH_PRIVKEY || '';
const ethRpcUrl = process.env.ETH_RPC_URL || '';

export const provider = new JsonRpcProvider(ethRpcUrl);
export const wallet = new Wallet(ethPrivkey, provider);
