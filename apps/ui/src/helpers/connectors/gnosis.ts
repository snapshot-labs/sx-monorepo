import Connector from './connector';

export default class extends Connector {
  async connect() {
    try {
      if (window?.parent === window) {
        return;
      }

      let SafeAppsSDK = await import('@safe-global/safe-apps-sdk'!);
      if (SafeAppsSDK?.default) SafeAppsSDK = SafeAppsSDK.default;
      if (SafeAppsSDK?.default) SafeAppsSDK = SafeAppsSDK.default;

      const sdk = new SafeAppsSDK();
      const safe = await sdk.safe.getInfo();

      let SafeAppProvider = await import('@safe-global/safe-apps-provider'!);
      if (SafeAppProvider?.default) SafeAppProvider = SafeAppProvider.default;
      if (SafeAppProvider?.default) SafeAppProvider = SafeAppProvider.default;
      if (SafeAppProvider?.SafeAppProvider)
        SafeAppProvider = SafeAppProvider.SafeAppProvider;

      this.provider = new SafeAppProvider(safe, sdk);
    } catch (e) {
      console.error(e);
    }
  }
}
