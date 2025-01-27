import { Web3Provider } from '@ethersproject/providers';
import { formatUnits } from '@ethersproject/units';
import networks from '@snapshot-labs/snapshot.js/src/networks.json';
import { constants } from 'starknet';
import { formatAddress, lsGet, lsRemove, lsSet } from '@/helpers/utils';
import { STARKNET_CONNECTORS } from '@/networks/common/constants';
import { Connector } from '@/networks/types';
import { ChainId } from '@/types';

type Web3providerWithSafe = Web3Provider & {
  provider: Web3Provider['provider'] & {
    safe?: {
      safeAddress: string;
      chainId: ChainId;
    };
  };
};

const LAST_USED_CONNECTOR_CACHE_KEY = 'connector';

const STARKNET_NETWORKS = {
  [constants.StarknetChainId.SN_MAIN]: {
    key: constants.StarknetChainId.SN_MAIN,
    chainId: constants.StarknetChainId.SN_MAIN,
    explorer: { url: 'https://starkscan.co' }
  },
  [constants.StarknetChainId.SN_SEPOLIA]: {
    key: constants.StarknetChainId.SN_SEPOLIA,
    chainId: constants.StarknetChainId.SN_SEPOLIA,
    explorer: { url: 'https://sepolia.starkscan.co' }
  }
};

Object.assign(networks, STARKNET_NETWORKS);

const defaultNetwork: any =
  import.meta.env.VITE_DEFAULT_NETWORK || Object.keys(networks)[0];

const state = reactive({
  account: '',
  name: '',
  network: networks[defaultNetwork],
  authLoading: false
});
const authInitiated = ref(false);
const loadedProviders = ref(new Set<Connector['id']>());
const currentConnector = ref<Connector | null>(null);
const provider = ref<Web3providerWithSafe | null>(null);

export function useWeb3() {
  const { connectors } = useConnectors();

  async function login(connector: Connector) {
    connectUsing(connector, 'connect');
  }

  async function autoLogin(connectorId?: string) {
    authInitiated.value = true;

    const id = connectorId ?? lsGet(LAST_USED_CONNECTOR_CACHE_KEY);

    if (!id) return;

    const connector = connectors.value.find(connector => connector.id === id);

    if (!connector) return;

    connectUsing(connector, 'autoConnect');
  }

  async function connectUsing(
    connector: Connector,
    connectFn: 'connect' | 'autoConnect'
  ) {
    authInitiated.value = true;
    state.authLoading = true;

    try {
      await connector[connectFn]();

      if (!connector.provider) {
        throw new Error(`Unable to connect to provider ${connector.id}`);
      }

      await registerConnector(connector);
    } catch (e) {
      reset();
    } finally {
      state.authLoading = false;
    }
  }

  function logout(connector: Connector | null = currentConnector.value) {
    if (connector) {
      removeConnectorEvents(connector);
      connector.disconnect();
    }

    if (connector?.id === currentConnector.value?.id) reset();
  }

  function reset() {
    lsRemove(LAST_USED_CONNECTOR_CACHE_KEY);
    currentConnector.value = null;
    provider.value = null;
    state.account = '';
    state.name = '';
  }

  async function registerConnector(connector: Connector) {
    const web3: Web3providerWithSafe = new Web3Provider(
      connector.provider,
      'any'
    );

    provider.value = markRaw(web3);
    currentConnector.value = connector;
    lsSet(LAST_USED_CONNECTOR_CACHE_KEY, connector.id);

    try {
      attachConnectorEvents(connector);
      let network, accounts;
      try {
        if (connector.id === 'gnosis' && web3.provider.safe) {
          const { chainId: safeChainId, safeAddress } = web3.provider.safe;
          network = { chainId: safeChainId };
          accounts = [safeAddress];
        } else if (STARKNET_CONNECTORS.includes(connector.type)) {
          network = {
            chainId:
              connector.provider.chainId ||
              connector.provider.provider.chainId ||
              connector.provider.provider.provider.chainId
          };
          accounts = [connector.provider.selectedAddress];
        } else {
          [network, accounts] = await Promise.all([
            web3.getNetwork(),
            web3.listAccounts()
          ]);
        }
      } catch (e) {
        console.log(e);
      }
      const acc = accounts.length > 0 ? accounts[0] : null;

      if (acc) {
        handleChainChanged(network.chainId);
        const usersStore = useUsersStore();
        try {
          await usersStore.fetchUser(formatAddress(acc));
        } catch (e) {
          console.warn('failed to fetch user', e);
        }
        state.account = formatAddress(acc);
        state.name = usersStore.getUser(acc)?.name || '';
      }
    } catch (e) {
      reset();
      return Promise.reject(e);
    }
  }

  function handleChainChanged(chainId: ChainId) {
    if (!networks[chainId]) {
      networks[chainId] = {
        ...networks[defaultNetwork],
        chainId,
        name: 'Unknown',
        unknown: true
      };
    }
    state.network = networks[chainId];
  }

  function attachConnectorEvents(connector: Connector) {
    if (loadedProviders.value.has(connector.id)) return;

    loadedProviders.value.add(connector.id);

    if (!connector.provider.on) return;

    connector.provider.on('accountsChanged', async accounts => {
      if (!accounts?.length) {
        logout(connector);
        return;
      }

      state.account = formatAddress(accounts[0]);
      await login(connector);
    });

    if (!STARKNET_CONNECTORS.includes(connector.type)) {
      connector.provider.on('chainChanged', async chainId => {
        handleChainChanged(parseInt(formatUnits(chainId, 0)));
      });
    }

    // provider.on('disconnect', async () => {});
  }

  function removeConnectorEvents(connector: Connector) {
    loadedProviders.value.delete(connector.id);

    try {
      connector.provider.removeAllListeners();
    } catch (e: any) {}
  }

  return {
    login,
    logout,
    autoLogin,
    auth: computed(() =>
      currentConnector.value
        ? {
            connector: currentConnector.value!,
            provider: provider.value!,
            account: state.account
          }
        : null
    ),
    authInitiated,
    web3: computed(() => state),
    web3Account: computed(() => state.account)
  };
}
