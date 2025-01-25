import { Connector, ConnectorType } from '@/networks/types';

export default class {
  public id: string;
  public type: ConnectorType;
  public info: Connector['info'];
  public options: Connector['options'];
  public provider: Connector['provider'];

  constructor(
    id: string,
    type: ConnectorType,
    info: Connector['info'],
    options: Connector['options'],
    provider: Connector['provider']
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
