import { CheckpointConfig } from '@snapshot-labs/checkpoint';
import Schnaps from './abis/Schnaps';

const CONFIG = {
  sep: {
    networkNodeUrl: 'https://rpc.brovider.xyz/11155111',
    contract: '0xe40bfeb5a3014c9b98597088ca71eccdc27ca410',
    start: 7802789,
    maxBlocksPerRequest: 10000
  },
  eth: {
    networkNodeUrl: 'https://rpc.brovider.xyz/1',
    contract: '0xe40bfeb5a3014c9b98597088ca71eccdc27ca410',
    start: 21966192,
    maxBlocksPerRequest: 1000
  },
  // Only Snapshot Plus credits are paid on Base, from when the UI offers it
  base: {
    networkNodeUrl: 'https://rpc.brovider.xyz/8453',
    contract: '0xe40bfeb5a3014c9b98597088ca71eccdc27ca410',
    start: 53424000,
    maxBlocksPerRequest: 1000
  }
};

// Pro is paid on NETWORK only, Snapshot Plus credits on every network
export const NETWORK = process.env.INDEX_TESTNET ? 'sep' : 'eth';
export const NETWORKS: (keyof typeof CONFIG)[] = process.env.INDEX_TESTNET
  ? [NETWORK]
  : [NETWORK, 'base'];

export const PLANS = ['monthly', 'yearly'] as const;
export type Plan = (typeof PLANS)[number];

export const TURBO_PRICE_USD: Record<Plan, number> = {
  monthly: 600,
  yearly: 6000
};

export const TURBO_PRICE_CENTS: Record<Plan, number> = {
  monthly: TURBO_PRICE_USD.monthly * 100,
  yearly: TURBO_PRICE_USD.yearly * 100
};

export function createConfig(
  indexerName: keyof typeof CONFIG
): CheckpointConfig {
  const { networkNodeUrl, contract, start, maxBlocksPerRequest } =
    CONFIG[indexerName];

  return {
    network_node_url: networkNodeUrl,
    optimistic_indexing: false,
    fetch_interval: 15000,
    max_blocks_per_request: maxBlocksPerRequest, // what the RPC serves in one getLogs call
    sources: [
      {
        contract,
        start,
        abi: 'Schnaps',
        events: [
          {
            name: 'PaymentReceived(address,address,uint256,string)',
            fn: 'handlePaymentReceived'
          }
        ]
      }
    ],
    abis: {
      Schnaps
    }
  };
}
