import { Provider } from '@ethersproject/providers';
import { RpcProvider } from 'starknet';
import { starknetNetworks } from '@/networks';
import { METADATA } from '@/networks/evm';
import { NetworkID } from '@/types';

export const MANA_URL =
  import.meta.env.VITE_MANA_URL || 'http://localhost:3000';

const MINIMUM_RELAYER_BALANCES = {
  eth: 0.01,
  stark: 0.1
};

async function rpcCall(path: string, method: string, params: any) {
  const res = await fetch(`${MANA_URL}/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
      id: null
    })
  });

  const { error, result } = await res.json();
  if (error) throw new Error('RPC call failed');

  return result;
}

export async function registerTransaction(
  chainId: number | string,
  params: {
    type: string;
    sender: string;
    hash: string;
    payload: any;
  }
) {
  return rpcCall(`stark_rpc/${chainId}`, 'registerTransaction', params);
}

export async function executionCall(
  network: 'eth' | 'stark',
  chainId: number | string,
  method:
    | 'finalizeProposal'
    | 'execute'
    | 'executeQueuedProposal'
    | 'executeStarknetProposal',
  params: any
) {
  return rpcCall(`${network}_rpc/${chainId}`, method, params);
}

async function fetchGasBalance(
  provider: Provider | RpcProvider,
  address: string,
  isStarknet: boolean
): Promise<number> {
  let balance;

  if (isStarknet) {
    const starknetProvider = provider as RpcProvider;
    const token =
      '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';

    const balanceResponse = await starknetProvider.callContract({
      contractAddress: token,
      entrypoint: 'balanceOf',
      calldata: [address]
    });

    balance = Number(balanceResponse[0]);
  } else {
    const evmProvider = provider as Provider;
    balance = await evmProvider.getBalance(address);
  }

  return parseFloat(balance.toString()) / 1e18;
}

export async function getRelayerInfo(
  space: string,
  network: NetworkID,
  provider: Provider | RpcProvider
): Promise<{
  address: string;
  balance: number;
  ticker: string;
  hasMinimumBalance: boolean;
} | null> {
  try {
    const isStarknet = starknetNetworks.includes(network);
    const networkType = isStarknet ? 'stark' : 'eth';

    const res = await fetch(
      `${MANA_URL}/${networkType}_rpc/relayers/spaces/${network}:${space}`
    );
    const data = await res.json();
    if (!data.address) {
      return null;
    }

    data.balance = await fetchGasBalance(provider, data.address, isStarknet);
    data.ticker = isStarknet ? 'STRK' : (METADATA[network].ticker ?? 'ETH');
    data.hasMinimumBalance =
      data.balance >= MINIMUM_RELAYER_BALANCES[networkType];

    return data;
  } catch (e) {
    console.error('Failed to fetch relayer info:', e);
    return null;
  }
}
