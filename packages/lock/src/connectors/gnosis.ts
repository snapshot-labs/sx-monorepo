import Connector from './connector';

export default class Gnosis extends Connector {
  async connect() {
    try {
      if (window?.parent === window) {
        return;
      }

      const { default: SafeAppsSDK } = await import(
        '@safe-global/safe-apps-sdk'
      );

      const sdk = new SafeAppsSDK();
      const safe = await sdk.safe.getInfo();

      const { SafeAppProvider } = await import(
        '@safe-global/safe-apps-provider'
      );

      this.provider = new SafeAppProvider(safe, sdk);
    } catch (err) {
      console.error(err);
    }
  }
}
