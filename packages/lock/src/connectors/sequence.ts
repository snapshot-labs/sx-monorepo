import Connector from './connector';

const projectAccessKey = 'AQAAAAAAAJbd_5JOcE50AqglZCtvu51YlGI';

export default class Sequence extends Connector {
  async getWallet(): Promise<any> {
    const sequence = await import('0xsequence');
    return sequence.initWallet(projectAccessKey);
  }

  async connect() {
    const theme = this.options.getTheme?.() ?? 'light';

    try {
      const wallet = await this.getWallet();

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { getTheme, ...options } = this.options;
      const connectDetails = await wallet.connect({
        ...options,
        authorize: true,
        settings: {
          theme
        }
      });

      if (!connectDetails.connected) {
        throw new Error('Connector was not connected');
      }

      this.provider = wallet;
    } catch (err) {
      console.error(err);
    }
  }

  async disconnect() {
    try {
      await this.provider.disconnect();
    } catch (err) {
      console.error(err);
    }
  }

  async autoConnect(): Promise<void> {
    // NOTE: We disable autoconnect for Sequence WaaS as it uses a popup
    // and browsers are likely to block it if it's not user-initiated
    return;
  }
}
