import Connector from './connector';

/**
 * Bramble Starknet wallet (https://github.com/starknet-innovation/bramble).
 *
 * The extension injects `window.starknet_bramble`, a get-starknet style wallet
 * that only speaks the standard wallet API (`request({ type, params })`). The
 * rest of the app expects a starknet.js account on `provider.account`, so the
 * wallet is wrapped in a `WalletAccount`, rebuilt when the chain or the
 * address changes.
 */
type BrambleWallet = {
  id: 'bramble';
  name: string;
  icon: string;
  chainId?: string;
  selectedAddress?: string;
  isConnected: boolean;
  enable: () => Promise<readonly string[]>;
  isPreauthorized: () => Promise<boolean>;
  request: (args: { type: string; params?: unknown }) => Promise<unknown>;
  on: (event: string, handler: (...args: any[]) => void) => void;
  off: (event: string, handler: (...args: any[]) => void) => void;
};

/** The content script can inject after the app starts; wait for it briefly. */
const INJECT_TIMEOUT_MS = 1000;
const INSTALL_URL =
  'https://github.com/starknet-innovation/bramble/releases/latest';

function findWallet(): Promise<BrambleWallet | undefined> {
  const read = () => (window as any).starknet_bramble as BrambleWallet;
  if (read()) return Promise.resolve(read());

  return new Promise(resolve => {
    const done = () => {
      window.removeEventListener('starknet#initialized', done);
      clearTimeout(timer);
      resolve(read());
    };
    const timer = setTimeout(done, INJECT_TIMEOUT_MS);
    window.addEventListener('starknet#initialized', done);
  });
}

export default class Bramble extends Connector {
  async connect() {
    this.provider = undefined;

    const wallet = await findWallet();
    if (!wallet) {
      // Not installed: send the user to the extension download.
      window.open(INSTALL_URL, '_blank', 'noopener');
      return;
    }

    try {
      const [address] = await wallet.enable();
      if (!address) throw new Error('Bramble returned no account');
      if (!wallet.chainId) {
        await wallet.request({ type: 'wallet_requestChainId' });
      }

      this.provider = await this.wrap(wallet);
    } catch (err) {
      console.error(err);
    }
  }

  async autoConnect() {
    const wallet = await findWallet();
    if (!wallet || !(await wallet.isPreauthorized())) return;

    return this.connect();
  }

  private async wrap(wallet: BrambleWallet) {
    const { WalletAccount } = await import('starknet');
    const getRpcUrl: ((chainId: string) => string) | undefined =
      this.options?.getRpcUrl;

    let cached: { key: string; account: InstanceType<typeof WalletAccount> };

    const getAccount = () => {
      const address = wallet.selectedAddress ?? '';
      const chainId = wallet.chainId ?? '';
      const key = `${chainId}:${address}`;
      if (cached?.key !== key) {
        const nodeUrl = getRpcUrl?.(chainId);
        cached = {
          key,
          account: new WalletAccount(
            nodeUrl ? { nodeUrl } : {},
            wallet as any,
            address
          )
        };
      }
      return cached.account;
    };

    return {
      id: wallet.id,
      name: wallet.name,
      icon: wallet.icon,
      get chainId() {
        return wallet.chainId;
      },
      get selectedAddress() {
        return wallet.selectedAddress;
      },
      get isConnected() {
        return wallet.isConnected;
      },
      get account() {
        return getAccount();
      },
      enable: wallet.enable,
      isPreauthorized: wallet.isPreauthorized,
      request: wallet.request,
      on: wallet.on,
      off: wallet.off
    };
  }
}
