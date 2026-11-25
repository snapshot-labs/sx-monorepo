// Type-only use: dropped from the output, so starknetkit still loads lazily.
import { InjectedConnector } from 'starknetkit/injected';

/**
 * Bramble Starknet wallet (https://github.com/starknet-innovation/bramble),
 * listed inside the starknetkit "Starknet" picker next to Ready and Braavos.
 *
 * Bramble injects `window.starknet_bramble`, a get-starknet style wallet that
 * only speaks the standard wallet API (`request({ type, params })`). It has
 * no legacy `account` or `provider`, which starknetkit's InjectedConnector
 * needs, so it gets its own connector. The connected wallet is wrapped so the
 * app finds a starknet.js account on `wallet.account`, like other wallets.
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

type GetRpcUrl = (chainId: string) => string | undefined;

const BRAMBLE_ICON =
  'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20128%20128%22%3E%3Crect%20width%3D%22128%22%20height%3D%22128%22%20fill%3D%22%23fff5ec%22%2F%3E%3Cpath%20fill%3D%22%23282729%22%20fill-rule%3D%22nonzero%22%20transform%3D%22translate(14.08%2017.6702)%20scale(1.4717)%22%20d%3D%22M%2045.711%2019.662%20C%2049.487%2019.945%2052.993%2021.612%2055.51%2024.365%20C%2058.409%2027.537%2059.631%2031.795%2059.126%2036.05%20C%2058.321%2042.467%2054.205%2047.468%2048.703%2050.629%20C%2055.983%2048.704%2060.727%2041.739%2061.153%2034.448%20C%2061.504%2028.439%2058.657%2022.925%2053.386%2019.969%20C%2048.474%2017.215%2042.528%2017.305%2037.267%2019.38%20C%2036.471%2018.685%2035.799%2017.935%2035.15%2017.029%20L%2027.892%2017.361%20L%2027.584%2017.17%20C%2027.514%2017.126%2027.619%2016.883%2027.674%2016.82%20L%2033.469%2012.722%20C%2032.691%207.263%2036.313%202.932%2041.193%201.079%20C%2048.657%20-1.755%2057.048%201.153%2061.243%207.927%20C%2063.608%2011.744%2064.677%2016.225%2064.324%2020.722%20C%2067.223%2024.95%2068.245%2030.189%2067.698%2035.235%20C%2066.964%2041.565%2064.09%2047.408%2059.676%2051.983%20C%2055.113%2056.713%2049.111%2059.695%2042.562%2060.421%20C%2039.665%2060.742%2036.85%2060.73%2033.937%2060.47%20C%2030.742%2060.185%2027.674%2059.681%2024.598%2059.046%20L%2014.648%2062.961%20L%200%2056.566%20L%2017.035%2048.129%20C%2018.379%2044.947%2019.864%2041.86%2021.524%2038.816%20C%2023.036%2036.079%2024.618%2033.495%2026.466%2030.982%20C%2031.072%2024.772%2037.426%2019.042%2045.71%2019.663%20L%2045.711%2019.662%20Z%20M%2040.277%209.215%20C%2039.225%209.463%2038.696%2010.46%2038.984%2011.452%20C%2039.23%2012.298%2040.174%2012.86%2041.098%2012.638%20C%2042.022%2012.417%2042.601%2011.477%2042.395%2010.551%20C%2042.19%209.624%2041.302%208.973%2040.277%209.214%20L%2040.277%209.215%20Z%22%2F%3E%3C%2Fsvg%3E';
const INSTALL_URL =
  'https://github.com/starknet-innovation/bramble/releases/latest';

/** The content script can inject after the app starts; wait for it briefly. */
const INJECT_TIMEOUT_MS = 1000;

function getInjectedWallet(): BrambleWallet | undefined {
  return (window as any).starknet_bramble;
}

function waitForWallet(): Promise<BrambleWallet | undefined> {
  if (getInjectedWallet()) return Promise.resolve(getInjectedWallet());

  return new Promise(resolve => {
    const done = () => {
      window.removeEventListener('starknet#initialized', done);
      clearTimeout(timer);
      resolve(getInjectedWallet());
    };
    const timer = setTimeout(done, INJECT_TIMEOUT_MS);
    window.addEventListener('starknet#initialized', done);
  });
}

/** Adds a starknet.js `account`, rebuilt when the chain or address changes. */
async function wrapWallet(wallet: BrambleWallet, getRpcUrl?: GetRpcUrl) {
  const { WalletAccount } = await import('starknet');
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

/**
 * Builds the starknetkit connector. It extends InjectedConnector only to be a
 * starknetkit Connector (the base class is not exported at runtime); every
 * member that reads the injected wallet is replaced.
 */
export async function createBrambleConnector({
  getRpcUrl,
  canOpenInstallPage
}: {
  getRpcUrl?: GetRpcUrl;
  /** False when reconnecting silently, so no tab opens on page load. */
  canOpenInstallPage: boolean;
}): Promise<InjectedConnector> {
  const { InjectedConnector: Base } = await import('starknetkit/injected');

  class BrambleConnector extends Base {
    private wrapped: Awaited<ReturnType<typeof wrapWallet>> | undefined;

    get id() {
      return 'bramble';
    }

    get name() {
      return getInjectedWallet() ? 'Bramble' : 'Install Bramble';
    }

    get icon() {
      const icon = getInjectedWallet()?.icon || BRAMBLE_ICON;
      return { light: icon, dark: icon };
    }

    get wallet() {
      return this.wrapped as any;
    }

    available() {
      return !!getInjectedWallet();
    }

    async ready() {
      return (await getInjectedWallet()?.isPreauthorized()) ?? false;
    }

    async connect() {
      const wallet = await waitForWallet();
      if (!wallet) {
        if (canOpenInstallPage) window.open(INSTALL_URL, '_blank', 'noopener');
        throw new Error('Bramble is not installed');
      }

      const [address] = await wallet.enable();
      if (!address) throw new Error('Bramble returned no account');
      if (!wallet.chainId) {
        await wallet.request({ type: 'wallet_requestChainId' });
      }

      this.wrapped = await wrapWallet(wallet, getRpcUrl);
      return {
        account: address,
        chainId: wallet.chainId ? BigInt(wallet.chainId) : undefined
      };
    }

    async disconnect() {
      // Bramble has no disconnect request; forget the session locally.
      this.wrapped = undefined;
    }

    async account() {
      if (!this.wrapped) throw new Error('Bramble is not connected');
      return this.wrapped.account as any;
    }

    async chainId() {
      const chainId = getInjectedWallet()?.chainId;
      if (!chainId) throw new Error('Bramble is not connected');
      return BigInt(chainId);
    }
  }

  return new BrambleConnector({ options: { id: 'bramble' } });
}
