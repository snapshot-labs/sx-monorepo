import { JsonRpcProvider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import { NonceManager } from '@ethersproject/experimental';

const ethPrivkey = process.env.ETH_PRIVKEY || '';
const ethRpcUrl = process.env.ETH_RPC_URL || '';

export const provider = new JsonRpcProvider(ethRpcUrl);
export const wallet = new Wallet(ethPrivkey, provider);
export const signer = new NonceManager(wallet);
