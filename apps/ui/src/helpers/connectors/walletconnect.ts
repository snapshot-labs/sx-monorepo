import Connector from './connector';

export default class extends Connector {
  async connect() {
    try {
      const imports = await import('@walletconnect/ethereum-provider'!);
      const { EthereumProvider } = imports;

      this.provider = await EthereumProvider.init(this.options);
      await this.provider.enable();
    } catch (e) {
      console.error(e);
    }
  }

  removeHashFromLocalStorage() {
    if (!localStorage) return;

    const keys: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) as string;

      if (key.startsWith('wc@2:')) {
        keys.push(key);
      }
    }

    keys.forEach(key => localStorage.removeItem(key));
  }

  async disconnect() {
    if ('disconnect' in this.provider) {
      this.provider.disconnect().catch(this.removeHashFromLocalStorage);
      this.provider = null;
    } else {
      this.removeHashFromLocalStorage();
    }
  }
}
