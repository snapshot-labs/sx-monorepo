import EventEmitter from 'events';

declare global {
  interface WindowEventMap {
    'eip6963:announceProvider': EIP6963AnnounceProviderEvent;
  }
}

class EIP6963RequestProviderEvent extends Event {
  constructor() {
    super('eip6963:requestProvider');
  }
}

interface EIP6963AnnounceProviderEvent extends Event {
  type: 'eip6963:announceProvider';
  detail: EIP6963ProviderDetail;
}

interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: EIP1193Provider;
}

interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

interface EIP1193Provider {
  request(request: {
    method: string;
    params?: Array<any> | Record<string, any>;
  }): Promise<any>;
}

export default class Eip6963 extends EventEmitter {
  providerDetails: EIP6963ProviderDetail[];

  constructor() {
    super();
    this.providerDetails = [];
  }

  private providerReceived(providerDetail: EIP6963ProviderDetail): void {
    this.providerDetails.push(providerDetail);
  }

  subscribe(): void {
    window.addEventListener(
      'eip6963:announceProvider',
      (event: EIP6963AnnounceProviderEvent) => {
        this.providerReceived(event.detail);
      }
    );
  }

  requestProviders(): void {
    this.providerDetails = [];
    window.dispatchEvent(new EIP6963RequestProviderEvent());
  }
}
