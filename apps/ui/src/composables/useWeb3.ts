import { Web3Provider } from '@ethersproject/providers';
import { getInstance } from '@snapshot-labs/lock/plugins/vue3';
import { formatUnits } from '@ethersproject/units';
import { getNames } from '@/helpers/stamp';
import { formatAddress } from '@/helpers/utils';
import networks from '@/helpers/networks.json';

networks['starknet'] = {
  key: 'starknet',
  name: 'Starknet',
  explorer: 'https://testnet.starkscan.co'
};

let auth;
const defaultNetwork: any = import.meta.env.VITE_DEFAULT_NETWORK || Object.keys(networks)[0];

const state = reactive({
  account: '',
  name: '',
  type: '',
  walletconnect: '',
  network: networks[defaultNetwork],
  authLoading: false
});
const authInitiated = ref(false);

export function useWeb3() {
  const { mixpanel } = useMixpanel();

  async function login(connector: string | undefined | boolean = 'injected') {
    authInitiated.value = true;

    if (!connector) return;

    auth = getInstance();
    state.authLoading = true;
    await auth.login(connector);
    if (auth.provider.value) {
      mixpanel.track('Connect', { connector });

      auth.web3 = new Web3Provider(auth.provider.value, 'any');
      await loadProvider();
    }

    // NOTE: Handle case where metamask stays locked after user ignored
    // the unlock request on subsequent page loads
    if (state.type !== 'injected' || auth.provider?.value?._state?.isUnlocked) {
      state.authLoading = false;
    }
  }

  function logout() {
    auth = getInstance();
    auth.logout();
    state.account = '';
    state.name = '';
    state.type = '';
    state.walletconnect = '';
  }

  async function loadProvider() {
    const connector = auth.provider.value?.connectorName;
    try {
      if (auth.provider.value.on && connector !== 'argentx') {
        auth.provider.value.on('chainChanged', async chainId => {
          handleChainChanged(parseInt(formatUnits(chainId, 0)));
        });
        auth.provider.value.on('accountsChanged', async accounts => {
          if (accounts.length !== 0) {
            state.account = formatAddress(accounts[0]);
            await login();
          }
        });
        // auth.provider.on('disconnect', async () => {});
      }
      let network, accounts;
      try {
        if (connector === 'gnosis') {
          const { chainId: safeChainId, safeAddress } = auth.web3.provider.safe;
          network = { chainId: safeChainId };
          accounts = [safeAddress];
        } else if (connector === 'argentx') {
          network = { key: 'starknet', chainId: 'starknet' };
          accounts = [auth.provider.value.selectedAddress];
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
        const names = await getNames([acc]);
        state.account = formatAddress(acc);
        state.name = names[acc];
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

  return {
    login,
    logout,
    authInitiated,
    web3: computed(() => state),
    web3Account: computed(() => state.account)
  };
}
