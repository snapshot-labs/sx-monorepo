import Connector from './connector';

export default class Injected extends Connector {
  async connect() {
    try {
      await this.provider.request({ method: 'eth_requestAccounts' });
    } catch (e: any) {
      console.log(e);
      if (e.code === 4001 || e.code === -32002) return;
    }
  }

  async autoConnect() {
    const accounts = await this.provider.request({ method: 'eth_accounts' });

    return accounts.length > 0 ? this.provider : null;
  }

  async isConnected() {
    if (this.provider.request({ method: 'eth_accounts' })) return true;
    await new Promise(r => setTimeout(r, 400));
    return !!this.provider.request({ method: 'eth_accounts' });
  }
}
