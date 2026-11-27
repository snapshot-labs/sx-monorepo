import { WalletAccount } from 'starknet';
import { InjectedConnector } from 'starknetkit/injected';

type BrambleWallet = ConstructorParameters<typeof WalletAccount>[1] & {
  icon: string;
  enable: () => Promise<[string, ...string[]]>;
  isPreauthorized: () => Promise<boolean>;
};

function getInjectedWallet(): BrambleWallet | undefined {
  return (window as any).starknet_bramble;
}

/**
 * starknetkit connector for Bramble (https://github.com/starknet-innovation/bramble).
 * Bramble injects a wallet with only the request API, without the `account`
 * and `provider` that starknetkit's InjectedConnector reads, so this connector
 * adds a starknet.js account to it. starknetkit only uses the members below.
 */
export default class BrambleConnector extends InjectedConnector {
  #isSilent: boolean;
  #wallet?: InjectedConnector['wallet'];

  constructor({ isSilent }: { isSilent: boolean }) {
    super({ options: { id: 'bramble' } });
    this.#isSilent = isSilent;
  }

  // Empty when Bramble is not installed, which hides it from the modal.
  get name() {
    return getInjectedWallet()?.name ?? '';
  }

  get icon() {
    const icon = getInjectedWallet()?.icon;
    return { dark: icon, light: icon };
  }

  get wallet() {
    return this.#wallet!;
  }

  async connect() {
    const wallet = getInjectedWallet();
    if (!wallet) throw new Error('Bramble is not installed');
    // A locked Bramble holds `enable` until the user approves, so reconnect
    // on page load only when the site is still authorized.
    if (this.#isSilent && !(await wallet.isPreauthorized())) {
      throw new Error('Bramble is not authorized');
    }

    const [address] = await wallet.enable();
    // The injected wallet is frozen, so inherit from it to add the account.
    // The app only uses its address, execute and signMessage, which all go
    // through the wallet, so it needs no RPC node (`default` mutes the log).
    this.#wallet = Object.assign(Object.create(wallet), {
      account: new WalletAccount({ default: true }, wallet, address)
    });

    return { account: address };
  }

  // Bramble has no disconnect request, and the base class would throw.
  async disconnect() {}
}
