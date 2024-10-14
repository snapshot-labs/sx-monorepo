import { Web3Provider } from '@ethersproject/providers';
import { formatUnits } from '@ethersproject/units';
import { getInstance } from '@snapshot-labs/lock/plugins/vue3';
import { constants } from 'starknet';
import networks from '@/helpers/networks.json';
import { formatAddress } from '@/helpers/utils';
import { STARKNET_CONNECTORS } from '@/networks/common/constants';
import { Connector } from '@/networks/types';

const STARKNET_NETWORKS = {
  [constants.StarknetChainId.SN_MAIN]: {
    key: constants.StarknetChainId.SN_MAIN,
    chainId: constants.StarknetChainId.SN_MAIN,
    explorer: 'https://starkscan.co'
  },
  [constants.StarknetChainId.SN_SEPOLIA]: {
    key: constants.StarknetChainId.SN_SEPOLIA,
    chainId: constants.StarknetChainId.SN_SEPOLIA,
    explorer: 'https://sepolia.starkscan.co'
  }
};

Object.assign(networks, STARKNET_NETWORKS);

let auth;
const defaultNetwork: any =
  import.meta.env.VITE_DEFAULT_NETWORK || Object.keys(networks)[0];

const state = reactive({
  account: '',
  name: '',
  type: '',
  walletconnect: '',
  network: networks[defaultNetwork],
  authLoading: false
});
const authInitiated = ref(false);
const loadedProviders = ref(new Set<Connector>());

export function useWeb3() {
  async function login(connector: string | undefined | boolean = 'injected') {
    authInitiated.value = true;

    if (!connector) return;

    try {
      auth = getInstance();
      state.authLoading = true;
      await auth.login(connector);
      await registerProvider();

      // NOTE: Handle case where metamask stays locked after user ignored
      // the unlock request on subsequent page loads
      if (
        state.type !== 'injected' ||
        auth.provider?.value?._state?.isUnlocked
      ) {
        state.authLoading = false;
      }
    } finally {
      state.authLoading = false;
    }
  }

  async function autoLogin(preferredConnector?: string) {
    auth = getInstance();
    const connector: boolean | string =
      preferredConnector || (await auth.getConnector());

    authInitiated.value = true;

    if (!connector) return;

    state.authLoading = true;
    await auth.autoLogin(connector as string);
    await registerProvider();
    state.authLoading = false;
  }

  function logout() {
    auth = getInstance();
    removeProviderEvents(auth.provider.value);
    auth.logout();
    state.account = '';
    state.name = '';
    state.type = '';
    state.walletconnect = '';
  }

  async function registerProvider() {
    if (!auth.provider.value) return;

    auth.web3 = new Web3Provider(auth.provider.value, 'any');
    await loadProvider(auth.provider.value);
  }

  async function loadProvider(provider) {
    if (!provider) return;

    const connector = provider.connectorName;

    try {
      attachProviderEvents(provider);
      let network, accounts;
      try {
        if (connector === 'gnosis') {
          const { chainId: safeChainId, safeAddress } = auth.web3.provider.safe;
          network = { chainId: safeChainId };
          accounts = [safeAddress];
        } else if (STARKNET_CONNECTORS.includes(connector)) {
          network = {
            chainId:
              provider.chainId ||
              provider.provider.chainId ||
              provider.provider.provider.chainId
          };
          accounts = [provider.selectedAddress];
        } else {
          [network, accounts] = await Promise.all([
            auth.web3.getNetwork(),
            auth.web3.listAccounts()
          ]);
        }
      } catch (e) {
        console.log(e);
      }
      handleChainChanged(network.chainId);
      const acc = accounts.length > 0 ? accounts[0] : null;

      if (acc) {
        const usersStore = useUsersStore();
        try {
          await usersStore.fetchUser(formatAddress(acc));
        } catch (e) {
          console.warn('failed to fetch user', e);
        }
        state.account = formatAddress(acc);
        state.name = usersStore.getUser(acc)?.name || '';
      }

      // NOTE: metamask doesn't return connectorName
      state.type = connector ?? 'injected';
      state.walletconnect = auth.provider.value?.wc?.peerMeta?.name || '';
    } catch (e) {
      state.account = '';
      state.name = '';
      state.type = '';
      return Promise.reject(e);
    }
  }

  function handleChainChanged(chainId) {
    if (!networks[chainId]) {
      networks[chainId] = {
        ...networks[defaultNetwork],
        chainId,
        name: 'Unknown',
        unknown: true
      };
    }
    state.network = networks[chainId];

    const connector = auth.provider.value?.connectorName;
    if (typeof connector === 'undefined') {
      // NOTE: metamask doesn't return connectorName
      state.type = 'injected';
    }
  }

  function attachProviderEvents(provider) {
    const providerName: Connector = provider?.connectorName || 'injected';

    if (loadedProviders.value.has(providerName)) return;
    loadedProviders.value.add(providerName);

    if (!provider.on) return;

    provider.on('accountsChanged', async accounts => {
      if (!accounts?.length) {
        logout();
        return;
      }

      state.account = formatAddress(accounts[0]);
      await login(providerName);
    });

    if (!STARKNET_CONNECTORS.includes(providerName)) {
      provider.on('chainChanged', async chainId => {
        handleChainChanged(parseInt(formatUnits(chainId, 0)));
      });
    }

    // auth.provider.on('disconnect', async () => {});
  }

  function removeProviderEvents(provider) {
    loadedProviders.value.delete(provider?.connectorName || 'injected');

    try {
      provider.removeAllListeners();
    } catch (e: any) {}
  }

  return {
    login,
    logout,
    autoLogin,
    authInitiated,
    web3: computed(() => state),
    web3Account: computed(() => state.account)
  };
}
