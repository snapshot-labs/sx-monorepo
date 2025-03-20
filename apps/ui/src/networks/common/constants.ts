import { ConnectorType } from '@/networks/types';

export const EVM_CONNECTORS: ConnectorType[] = [
  'injected',
  'walletconnect',
  'coinbase',
  'gnosis',
  'sequence',
  'unicorn',
  'spectator'
];

export const STARKNET_CONNECTORS: ConnectorType[] = ['argentx'];
export const EDITOR_APP_NAME = 'snapshot-v2';
