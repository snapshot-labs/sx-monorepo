import { Chain, ThirdwebClient } from 'thirdweb';
import { Wallet } from 'thirdweb/wallets';
import Connector from './connector';

export default class Unicorn extends Connector {
  private wallet: Wallet | null = null;
  private client: ThirdwebClient | null = null;
  private chain: Chain | null = null;

  async getWallet() {
    // Auto-connect the wallet with account abstraction
    const [{ createThirdwebClient }, { autoConnect }, { polygon }] =
      await Promise.all([
        import('thirdweb'),
        import('thirdweb/wallets'),
        import('thirdweb/chains')
      ]);

    const client = createThirdwebClient({
      clientId: '4e8c81182c3709ee441e30d776223354'
    });
    this.chain = polygon;
    this.client = client;
    return new Promise<Wallet>(async (resolve, reject) => {
      const connected = await autoConnect({
        client,
        accountAbstraction: {
          chain: this.chain!,
          sponsorGas: true,
          factoryAddress: '0xD771615c873ba5a2149D5312448cE01D677Ee48A'
        },
        onConnect: async wallet => {
          resolve(wallet);
        }
      });
      if (connected === false) {
        reject(new Error("Couldn't connect"));
      }
      return;
    });
  }

  async connect() {
    try {
      const wallet = await this.getWallet();
      this.wallet = wallet;
      const { EIP1193 } = await import('thirdweb/wallets');
      if (wallet) {
        const EIP1193provider = EIP1193.toProvider({
          wallet,
          chain: this.chain!,
          client: this.client!
        });

        this.provider = {
          ...EIP1193provider,
          switchChain: async () => {
            // TODO: waiting for Thirdweb to expose a new API for this
            return;
          }
        };
      }
    } catch (e) {
      console.error(e);
    }
  }

  async disconnect() {
    try {
      await this.wallet?.disconnect();
    } catch (e) {
      console.error(e);
    }
  }

  async autoConnect(): Promise<void> {
    return this.connect();
  }
}
