import Connector from './connector';

export default class Coinbase extends Connector {
  async connect() {
    try {
      const { default: CoinbaseWalletSDK } = await import(
        '@coinbase/wallet-sdk'
      );

      const walletSDK = new CoinbaseWalletSDK(this.options);
      const provider = walletSDK.makeWeb3Provider();

      await provider.request({ method: 'eth_requestAccounts' });

      this.provider = provider;
    } catch (e) {
      console.error(e);
    }
  }

  async disconnect() {
    if (this.provider) {
      await this.provider.disconnect();
    }
  }
}
