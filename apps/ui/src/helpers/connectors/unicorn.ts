import { createThirdwebClient } from 'thirdweb';
import { polygon } from 'thirdweb/chains';
import { autoConnect, EIP1193, Wallet } from 'thirdweb/wallets';
import Connector from './connector';

const client = createThirdwebClient({
  clientId: '4e8c81182c3709ee441e30d776223354'
});

const chain = polygon;

export default class Unicorn extends Connector {
  private wallet: Wallet | null = null;

  async getWallet() {
    // Auto-connect the wallet with account abstraction

    return new Promise<Wallet>(async (resolve, reject) => {
      const connected = await autoConnect({
        client,
        accountAbstraction: {
          chain: chain,
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
      if (wallet) {
        const EIP1193provider = EIP1193.toProvider({
          wallet,
          chain,
          client
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
