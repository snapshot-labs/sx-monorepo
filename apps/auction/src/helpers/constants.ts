import { ChainId, NetworkID } from '@/types';

export const APP_NAME = 'Snapshot';

export const API_URL =
  import.meta.env.VITE_API_URL ?? 'https://api.snapshot.box';
export const API_TESTNET_URL =
  import.meta.env.VITE_API_TESTNET_URL ?? 'https://testnet-api.snapshot.box';

export const DOCS_URL = 'https://docs.snapshot.box';

export const EVM_EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000';
export const ETH_CONTRACT = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

export const CHAIN_IDS: Record<Exclude<NetworkID, 's' | 's-tn'>, ChainId> = {
  // EVM
  eth: 1,
  oeth: 10,
  bnb: 56,
  bnbt: 97,
  matic: 137,
  base: 8453,
  arb1: 42161,
  mnt: 5000,
  ape: 33139,
  curtis: 33111,
  sep: 11155111,
  // Starknet
  sn: '0x534e5f4d41494e',
  'sn-sep': '0x534e5f5345504f4c4941'
};

export const COINGECKO_ASSET_PLATFORMS = {
  1: 'ethereum',
  10: 'optimistic-ethereum',
  56: 'binance-smart-chain',
  100: 'xdai',
  137: 'polygon-pos',
  5000: 'mantle',
  8453: 'base',
  42161: 'arbitrum-one',
  33139: 'apechain',
  33111: 'apechain'
} as const;

export const COINGECKO_BASE_ASSETS = {
  ethereum: 'ethereum',
  'optimistic-ethereum': 'ethereum',
  'binance-smart-chain': 'binancecoin',
  xdai: 'xdai',
  'polygon-pos': 'matic-network',
  mantle: 'mantle',
  base: 'ethereum',
  'arbitrum-one': 'ethereum',
  apechain: 'apecoin'
} satisfies Record<
  (typeof COINGECKO_ASSET_PLATFORMS)[keyof typeof COINGECKO_ASSET_PLATFORMS],
  string
>;

export const MAX_SYMBOL_LENGTH = 12;

export const LAST_USED_CONNECTOR_CACHE_KEY = 'connector';

export const RECENT_CONNECTOR = 'recent-connector';
