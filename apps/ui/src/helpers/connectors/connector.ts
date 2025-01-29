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

  constructor(
    id: string,
    type: ConnectorType,
    info: ConnectorInstance['info'],
    options: ConnectorInstance['options'],
    provider: ConnectorInstance['provider']
  ) {
    this.id = id;
    this.info = info;
    this.options = options;
    this.provider = provider;
    this.type = type;
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
