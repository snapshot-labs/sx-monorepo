import { ConnectorType as LockConnectorType } from '@snapshot-labs/lock';

export type ConnectorType = LockConnectorType;

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
