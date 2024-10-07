import { ETH_CONTRACT } from '@/helpers/constants';
import { ChainId } from '@/types';
import {
  GetBalancesResponse,
  GetTokenBalancesResponse,
  GetTokensMetadataResponse
} from './types';
export * from './types';

const apiKey = import.meta.env.VITE_ALCHEMY_API_KEY;

export const SUPPORTED_CHAIN_IDS = [
  1, // Ethereum,
  10, // Optimism,
  137, // Polygon,
  324, // ZkSync Era
  8453, // Base
  42161, // Arbitrum
  42170, // Arbitrum Nova
  11155111 // Sepolia
] as const;

const NETWORKS: Record<(typeof SUPPORTED_CHAIN_IDS)[number], string> = {
  1: 'eth-mainnet',
  10: 'opt-mainnet',
  137: 'polygon-mainnet',
  324: 'zksync-mainnet',
  8453: 'base-mainnet',
  42161: 'arb-mainnet',
  42170: 'arbnova-mainnet',
  11155111: 'eth-sepolia'
};

function getApiUrl(chainId: ChainId) {
  const network = NETWORKS[chainId];
  if (!network) throw new Error('Unsupported chain for Alchemy API');

  return `https://${network}.g.alchemy.com/v2/${apiKey}`;
}

export async function request(method: string, params: any[], chainId: ChainId) {
  const res = await fetch(getApiUrl(chainId), {
    method: 'POST',
    body: JSON.stringify({
      id: 1,
      jsonrpc: '2.0',
      method,
      params
    })
  });

  const { result } = await res.json();

  return result;
}

export async function batchRequest(
  requests: { method: string; params: any[] }[],
  chainId: ChainId
) {
  const res = await fetch(getApiUrl(chainId), {
    method: 'POST',
    body: JSON.stringify(
      requests.map((request, i) => ({
        id: i,
        jsonrpc: '2.0',
        method: request.method,
        params: request.params
      }))
    )
  });

  const response = await res.json();

  return response.map(entry => entry.result);
}

/**
 * Gets Ethereum balance as hex encoded string.
 * @param address Ethereum address to fetch ETH balance for
 * @param chainId ChainId
 * @returns Hex encoded ETH balance
 */
export async function getBalance(
  address: string,
  chainId: ChainId
): Promise<string> {
  return request('eth_getBalance', [address, 'latest'], chainId);
}

/**
 * Gets ERC20 balances of tokens that provided address interacted with.
 * Response might include 0 balances.
 * @param address Ethereum address to fetch token balances for
 * @param chainId ChainId
 * @returns Token balances
 */
export async function getTokenBalances(
  address: string,
  chainId: ChainId
): Promise<GetTokenBalancesResponse> {
  const results = { address, tokenBalances: [], pageKey: null };
  let pageKey = null;

  while (true) {
    const pageResult = await request(
      'alchemy_getTokenBalances',
      [address, 'erc20', { pageKey }],
      chainId
    );

    results.tokenBalances = results.tokenBalances.concat(
      pageResult.tokenBalances
    );

    pageKey = pageResult.pageKey;

    if (!pageKey) break;
  }

  return results;
}

/**
 * Gets ERC20 tokens metadata (name, symbol, decimals, logo).
 * @param addresses Array of ERC20 tokens addresses
 * @param chainId ChainId
 * @returns Array of token metadata
 */
export async function getTokensMetadata(
  addresses: string[],
  chainId: ChainId
): Promise<GetTokensMetadataResponse> {
  return batchRequest(
    addresses.map(address => ({
      method: 'alchemy_getTokenMetadata',
      params: [address]
    })),
    chainId
  );
}

/**
 * Gets Ethereum and ERC20 balances including metadata for tokens.
 * @param address Ethereum address to fetch balances for
 * @param chainId ChainId
 * @returns Array of balances
 */
export async function getBalances(
  address: string,
  chainId: ChainId,
  baseToken: { name: string; symbol: string; logo?: string }
): Promise<GetBalancesResponse> {
  const [ethBalance, { tokenBalances }] = await Promise.all([
    getBalance(address, chainId),
    getTokenBalances(address, chainId)
  ]);

  const contractAddresses = tokenBalances.map(
    balance => balance.contractAddress
  );
  const metadata = await getTokensMetadata(contractAddresses, chainId);

  return [
    {
      name: baseToken.name,
      symbol: baseToken.symbol,
      decimals: 18,
      logo: null,
      contractAddress: ETH_CONTRACT,
      tokenBalance: ethBalance,
      price: 0,
      value: 0,
      change: 0
    },
    ...tokenBalances
      .map((balance, i) => ({
        ...balance,
        ...metadata[i],
        price: 0,
        value: 0,
        change: 0
      }))
      .filter(token => !token?.symbol?.includes('.'))
  ];
}
