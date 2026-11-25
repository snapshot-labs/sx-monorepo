export type ConnectorType =
  | 'argentx'
  | 'injected'
  | 'walletconnect'
  | 'coinbase'
  | 'gnosis'
  | 'sequence'
  | 'unicorn'
  | 'guest'
  | 'sandbox';

export type Connector = {
  id: string;
  type: ConnectorType;
  info: {
    name: string;
    icon?: unknown;
    ignoreRecent?: boolean;
  };
  options: any;
  provider: any;
  autoConnectOnly: boolean;
  connect: () => void;
  autoConnect: () => void;
  disconnect: () => void;
};
