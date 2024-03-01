import { Core } from '@walletconnect/core';
import { Web3Wallet } from '@walletconnect/web3wallet';
import { buildApprovedNamespaces, getSdkError } from '@walletconnect/utils';
import { ProposalTypes, SessionTypes } from '@walletconnect/types';
import { Interface } from '@ethersproject/abi';
import { formatUnits } from '@ethersproject/units';
import { BigNumber } from '@ethersproject/bignumber';
import { createContractCallTransaction } from '@/helpers/transactions';
import { getABI } from '@/helpers/etherscan';
import { SelectedStrategy } from '@/types';

type ApproveCallback = () => Promise<boolean>;
type ConnectionData = {
  logged: boolean;
  loading: boolean;
  session: SessionTypes.Struct | null;
  proposal: ProposalTypes.Struct | null;
};

let connector: Awaited<ReturnType<(typeof Web3Wallet)['init']>> | null = null;
async function getConnector() {
  if (connector) return connector;

  connector = await Web3Wallet.init({
    core: new Core({
      projectId: import.meta.env.VITE_WC_PROJECT_ID
    }),
    metadata: {
      name: 'Snapshot X',
      description: 'Snapshot X',
      url: 'https://snapshotx.org/',
      icons: []
    }
  });

  return connector;
}

const connections: Ref<Record<string, ConnectionData | undefined>> = ref({});

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
    if (!session.value) return;

    const connector = await getConnector();
    await connector.disconnectSession({
      topic: session.value.topic,
      reason: getSdkError('USER_DISCONNECTED')
    });

    proposal.value = null;
    session.value = null;
    logged.value = false;
  }

  function getApprovedNamespaces(proposal: ProposalTypes.Struct, chainId: number, account: string) {
    const requiredChains = proposal.requiredNamespaces.eip155?.chains || [];
    const optionalChains = proposal.optionalNamespaces.eip155?.chains || [];

    const chains = [...new Set([`eip155:${chainId}`, ...requiredChains, ...optionalChains])];
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

    if (logged.value) await logout();
    const connector = await getConnector();
    await connector.core.pairing.pair({ uri });

    connector.on('session_proposal', async ({ id, params }) => {
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
    });

    connector.on('session_request', async payload => {
      const { request } = payload.params;
      if (request.method !== 'eth_sendTransaction') return;

      try {
        const transaction = await parseCall(chainId, request);
        setTransaction(spaceKey, chainId, executionStrategy, transaction);

        await connector.respondSessionRequest({
          topic: payload.topic,
          response: {
            id: payload.id,
            jsonrpc: '2.0',
            error: getSdkError('USER_REJECTED')
          }
        });
      } catch (e) {
        console.error(e);
      }
    });

    connector.on('session_delete', () => {
      loading.value = false;
      logged.value = false;
    });
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
