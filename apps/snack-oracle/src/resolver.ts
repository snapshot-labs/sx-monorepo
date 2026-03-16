import {
  createWalletClient,
  http,
  defineChain,
  type Address
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { config } from './config.js';
import { snackMarketAbi } from './abis.js';

const anvil = defineChain({
  id: 13370,
  name: 'Anvil',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [config.rpcUrl] } }
});

const account = privateKeyToAccount(config.oraclePrivateKey);

const walletClient = createWalletClient({
  account,
  chain: anvil,
  transport: http(config.rpcUrl)
});

export async function resolveMarket(
  marketAddress: Address,
  winningOutcome: number
) {
  const hash = await walletClient.writeContract({
    address: marketAddress,
    abi: snackMarketAbi,
    functionName: 'resolve',
    args: [winningOutcome]
  });

  return hash;
}
