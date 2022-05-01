import { computed, reactive } from 'vue';
import { Web3Provider } from '@ethersproject/providers';
import { getInstance } from '@snapshot-labs/lock/plugins/vue3';
import networks from '@snapshot-labs/snapshot.js/src/networks.json';
import { formatUnits } from '@ethersproject/units';
import { getNames } from '@/helpers/ens';

networks['starknet'] = {
  key: 'starknet',
  name: 'StarkNet',
  explorer: 'https://goerli.voyager.online'
};

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

export function useWeb3() {
  async function login(connector = 'injected') {
    auth = getInstance();
    state.authLoading = true;
    await auth.login(connector);
    if (auth.provider.value) {
      auth.web3 = new Web3Provider(auth.provider.value, 'any');
      await loadProvider();
    }
    state.authLoading = false;
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
            state.account = accounts[0];
            await login();
          }
        });
        // auth.provider.on('disconnect', async () => {});
      }
      console.log('Provider', auth.provider.value);
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
      console.log('Network', network);
      console.log('Accounts', accounts);
      handleChainChanged(network.chainId);
      const acc = accounts.length > 0 ? accounts[0] : null;
      const names = await getNames([acc]);
      state.account = acc;
      state.name = names[acc];
      state.type = connector;
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
        network: 'unknown',
        unknown: true
      };
    }
    state.network = networks[chainId];
  }

  return {
    login,
    logout,
    web3: computed(() => state),
    web3Account: computed(() => state.account)
  };
}
