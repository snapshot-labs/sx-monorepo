import Connector from './connector';

export default class Walletlink extends Connector {
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

  removeHashFromLocalStorage() {
    if (!localStorage) return;

    const keys: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) as string;

      if (key.startsWith('-walletlink:')) {
        keys.push(key);
      }
    }

    keys.forEach(key => localStorage.removeItem(key));
  }

  async disconnect() {
    this.removeHashFromLocalStorage();
  }
}
