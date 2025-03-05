import Connector from './connector';

export default class Coinbase extends Connector {
  async connect() {
    try {
      let CoinbaseWalletSDK = await import('@coinbase/wallet-sdk'!);
      if (CoinbaseWalletSDK.default)
        CoinbaseWalletSDK = CoinbaseWalletSDK.default;
      if (CoinbaseWalletSDK.default)
        CoinbaseWalletSDK = CoinbaseWalletSDK.default;
      const walletSDK = new CoinbaseWalletSDK(this.options);
      this.provider = walletSDK.makeWeb3Provider(
        this.options.ethJsonrpcUrl,
        this.options.chainId
      );
      await this.provider.request({ method: 'eth_requestAccounts' });
    } catch (e) {
      console.error(e);
    }
  }

  async disconnect() {
    this.provider.disconnect();
  }
}
