import {
  Connector as ConnectorInstance,
  ConnectorType
} from '@/networks/types';

export default class Connector {
  public id: string;
  public type: ConnectorType;
  public info: ConnectorInstance['info'];
  public options: ConnectorInstance['options'];
  public provider: ConnectorInstance['provider'];
  public autoConnectOnly: ConnectorInstance['autoConnectOnly'];

  constructor({
    id,
    type,
    info,
    options,
    provider,
    autoConnectOnly
  }: {
    id: string;
    type: ConnectorType;
    info: ConnectorInstance['info'];
    options: ConnectorInstance['options'];
    provider: ConnectorInstance['provider'];
    autoConnectOnly: ConnectorInstance['autoConnectOnly'];
  }) {
    this.id = id;
    this.info = info;
    this.options = options;
    this.provider = provider;
    this.type = type;
    this.autoConnectOnly = autoConnectOnly;
  }

  async connect(): Promise<void> {}

  async autoConnect(): Promise<void> {
    return this.connect();
  }

  async disconnect(): Promise<void> {}

  async isConnected(): Promise<boolean> {
    return true;
  }
}
