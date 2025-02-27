import Connector from './connector';

const projectAccessKey = 'AQAAAAAAAJbd_5JOcE50AqglZCtvu51YlGI';

export default class Sequence extends Connector {
  async getWallet() {
    const sequence = await import('0xsequence');
    return sequence.initWallet(projectAccessKey);
  }

  async connect() {
    const { currentTheme } = useTheme();

    try {
      const wallet = await this.getWallet();

      const connectDetails = await wallet.connect({
        ...this.options,
        authorize: true,
        settings: {
          theme: currentTheme.value
        }
      });

      if (!connectDetails.connected) {
        throw new Error('Connector was not connected');
      }

      this.provider = wallet;
    } catch (e) {
      console.error(e);
    }
  }

  async disconnect() {
    try {
      await this.provider.disconnect();
    } catch (e) {
      console.error(e);
    }
  }

  async autoConnect(): Promise<void> {
    // NOTE: We disable autoconnect for Sequence WaaS as it uses a popup
    // and browsers are likely to block it if it's not user-initiated
    return;
  }
}
