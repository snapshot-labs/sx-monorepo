import { ConnectorType } from '@/networks/types';

export const EVM_CONNECTORS: ConnectorType[] = [
  'injected',
  'walletconnect',
  'coinbase',
  'gnosis',
  'sequence',
  'unicorn',
  'guest',
  'sandbox'
];

/** Connectors backed by a Starknet wallet (excludes read-only guest). */
export const STARKNET_WALLET_CONNECTORS: ConnectorType[] = [
  'argentx',
  'bramble'
];
export const STARKNET_CONNECTORS: ConnectorType[] = [
  ...STARKNET_WALLET_CONNECTORS,
  'guest'
];
export const EDITOR_APP_NAME = 'snapshot-v2';
