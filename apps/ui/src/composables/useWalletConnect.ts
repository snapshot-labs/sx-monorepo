import { Interface } from '@ethersproject/abi';
import { BigNumber } from '@ethersproject/bignumber';
import { formatUnits } from '@ethersproject/units';
import { WalletKit, WalletKitTypes } from '@reown/walletkit';
import { Core } from '@walletconnect/core';
import { ProposalTypes, SessionTypes } from '@walletconnect/types';
import { buildApprovedNamespaces, getSdkError } from '@walletconnect/utils';
import { APP_NAME } from '@/helpers/constants';
import { getABI } from '@/helpers/etherscan';
import { createContractCallTransaction } from '@/helpers/transactions';
import { NetworkID, SelectedStrategy } from '@/types';

type ApproveCallback = () => Promise<boolean>;
type ConnectionData = {
  logged: boolean;
  loading: boolean;
  session: SessionTypes.Struct | null;
  proposal: ProposalTypes.Struct | null;
};

let connector: Awaited<ReturnType<(typeof WalletKit)['init']>> | null = null;
async function getConnector() {
  if (connector) return connector;

  connector = await WalletKit.init({
    core: new Core({
      projectId: import.meta.env.VITE_WC_PROJECT_ID
    }),
    metadata: {
      name: APP_NAME,
      description: 'Where decisions get made',
      url: 'https://snapshot.box',
      icons: []
    }
  });

  return connector;
}

const connections: Ref<Record<string, ConnectionData | undefined>> = ref({});

let activeKey: string | null = null;
let activeCleanup: (() => void) | null = null;

async function disconnectConnection(key: string) {
  const data = connections.value[key];
  if (!data?.session) return;

  const connector = await getConnector();
  await connector.disconnectSession({
    topic: data.session.topic,
    reason: getSdkError('USER_DISCONNECTED')
  });

  connections.value[key] = {
    ...data,
    proposal: null,
    session: null,
    logged: false
  };
}

async function parseCall(chainId: number, call) {
  const params = call.params[0];

  const abi = await getABI(chainId, params.to);
  const iface = new Interface(abi);
  const tx = iface.parseTransaction(params);

  const abiFunction = iface.getFunction(tx.signature);

  const args = Object.fromEntries(
    abiFunction.inputs.map(input => {
      const rawValue = tx.args[input.name];
      let value = rawValue;
      if (BigNumber.isBigNumber(rawValue)) {
        value = rawValue.toString();
      } else if (Array.isArray(rawValue)) {
        value = rawValue.join(', ');
      }

      return [input.name, value];
    })
  );

  return createContractCallTransaction({
    form: {
      to: params.to,
      abi,
      method: tx.signature,
      amount: formatUnits(params.value || 0),
      args
    }
  });
}

export function useWalletConnect(
  networkId: NetworkID,
  chainId: number,
  account: string,
  spaceKey: string,
  executionStrategy: SelectedStrategy | null
) {
  const { setTransaction } = useWalletConnectTransaction();

  const key = computed(() => `${chainId}:${account}`);
  const connection = computed(
    () =>
      connections.value[key.value] || {
        loading: false,
        logged: false,
        session: null,
        proposal: null
      }
  );

  const logged = computed({
    get: () => connection.value.logged,
    set: value => {
      connections.value[key.value] = {
        ...connection.value,
        logged: value
      };
    }
  });

  const loading = computed({
    get: () => connection.value.loading,
    set: value => {
      connections.value[key.value] = {
        ...connection.value,
        loading: value
      };
    }
  });

  const session = computed({
    get: () => connection.value.session,
    set: value => {
      connections.value[key.value] = {
        ...connection.value,
        session: value
      };
    }
  });

  const proposal = computed({
    get: () => connection.value.proposal,
    set: value => {
      connections.value[key.value] = {
        ...connection.value,
        proposal: value
      };
    }
  });

  async function logout() {
    if (activeKey === key.value) {
      activeCleanup?.();
      activeCleanup = null;
      activeKey = null;
    }

    await disconnectConnection(key.value);
  }

  function getApprovedNamespaces(
    proposal: ProposalTypes.Struct,
    chainId: number,
    account: string
  ) {
    const requiredChains = proposal.requiredNamespaces.eip155?.chains || [];
    const optionalChains = proposal.optionalNamespaces.eip155?.chains || [];

    const chains = [
      ...new Set([`eip155:${chainId}`, ...requiredChains, ...optionalChains])
    ];
    const accounts = chains.map(chain => `${chain}:${account}`);

    return buildApprovedNamespaces({
      proposal,
      supportedNamespaces: {
        eip155: {
          chains,
          accounts,
          methods: ['eth_sendTransaction', 'personal_sign'],
          events: ['accountsChanged', 'chainChanged']
        }
      }
    });
  }

  async function connect(uri: string, approveCallback: ApproveCallback) {
    loading.value = true;

    activeCleanup?.();
    activeCleanup = null;

    if (activeKey && activeKey !== key.value) {
      await disconnectConnection(activeKey);
    } else if (logged.value) {
      await disconnectConnection(key.value);
    }

    activeKey = key.value;

    const connector = await getConnector();
    await connector.core.pairing.pair({ uri });

    const onSessionProposal = async ({
      id,
      params
    }: WalletKitTypes.SessionProposal) => {
      proposal.value = params;

      const approved = await approveCallback();

      if (!approved) {
        loading.value = false;
        proposal.value = null;

        return connector.rejectSession({
          id,
          reason: getSdkError('USER_REJECTED')
        });
      }

      session.value = await connector.approveSession({
        id,
        namespaces: getApprovedNamespaces(params, chainId, account)
      });

      await connector.emitSessionEvent({
        topic: session.value.topic,
        event: {
          name: 'chainChanged',
          data: chainId
        },
        chainId: `eip155:${chainId}`
      });

      logged.value = true;
      loading.value = false;
    };

    const onSessionRequest = async (payload: WalletKitTypes.SessionRequest) => {
      if (payload.topic !== session.value?.topic) return;

      const { request } = payload.params;
      if (request.method !== 'eth_sendTransaction') return;

      try {
        const transaction = await parseCall(chainId, request);
        setTransaction(
          spaceKey,
          networkId,
          chainId,
          executionStrategy,
          transaction
        );

        await connector.respondSessionRequest({
          topic: payload.topic,
          response: {
            id: payload.id,
            jsonrpc: '2.0',
            error: getSdkError('USER_REJECTED')
          }
        });
      } catch (err) {
        console.error(err);
      }
    };

    const onSessionDelete = (payload: WalletKitTypes.SessionDelete) => {
      if (payload.topic !== session.value?.topic) return;

      loading.value = false;
      logged.value = false;
      session.value = null;
      proposal.value = null;

      if (activeKey === key.value) {
        activeCleanup?.();
        activeCleanup = null;
        activeKey = null;
      }
    };

    connector.on('session_proposal', onSessionProposal);
    connector.on('session_request', onSessionRequest);
    connector.on('session_delete', onSessionDelete);

    activeCleanup = () => {
      connector.off('session_proposal', onSessionProposal);
      connector.off('session_request', onSessionRequest);
      connector.off('session_delete', onSessionDelete);
    };
  }

  return {
    parseCall,
    connect,
    logout,
    loading,
    logged,
    proposal
  };
}
