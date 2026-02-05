import { ConnectorType } from '@/networks/types';

export const EVM_CONNECTORS: ConnectorType[] = [
  'injected',
  'walletconnect',
  'coinbase',
  'gnosis',
  'sequence',
  'unicorn',
  'guest'
];

export const STARKNET_CONNECTORS: ConnectorType[] = ['argentx', 'guest'];
export const EDITOR_APP_NAME = 'snapshot-v2';
