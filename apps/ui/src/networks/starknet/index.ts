import {
  constants as starknetConstants,
  TransactionExecutionStatus,
  TransactionFinalityStatus
} from 'starknet';
import { createApi } from '../common/graphqlApi';
import { STARKNET_CONNECTORS } from '../common/constants';
import { createActions } from './actions';
import { createProvider } from './provider';
import { createConstants } from './constants';
import { pinPineapple } from '@/helpers/pin';
import { Network } from '@/networks/types';
import { NetworkID, Space } from '@/types';

type Metadata = {
  name: string;
  chainId: string;
  baseChainId: number;
  baseNetworkId: NetworkID;
  rpcUrl: string;
  ethRpcUrl: string;
  explorerUrl: string;
  apiUrl: string;
};

export const METADATA: Partial<Record<NetworkID, Metadata>> = {
  sn: {
    name: 'Starknet',
    chainId: starknetConstants.StarknetChainId.SN_MAIN,
    baseChainId: 1,
    baseNetworkId: 'eth',
    rpcUrl: `https://starknet-mainnet.infura.io/v3/${import.meta.env.VITE_INFURA_API_KEY}`,
    ethRpcUrl: `https://mainnet.infura.io/v3/${import.meta.env.VITE_INFURA_API_KEY}`,
    apiUrl: 'https://api-1.snapshotx.xyz',
    explorerUrl: 'https://starkscan.co'
  },
  'sn-tn': {
    name: 'Starknet (Goerli)',
    chainId: starknetConstants.StarknetChainId.SN_GOERLI,
    baseChainId: 5,
    baseNetworkId: 'gor',
    rpcUrl: `https://starknet-goerli.infura.io/v3/${import.meta.env.VITE_INFURA_API_KEY}`,
    ethRpcUrl: `https://goerli.infura.io/v3/${import.meta.env.VITE_INFURA_API_KEY}`,
    apiUrl: 'https://testnet-api-1.snapshotx.xyz',
    explorerUrl: 'https://testnet.starkscan.co'
  },
  'sn-sep': {
    name: 'Starknet (Sepolia)',
    chainId: starknetConstants.StarknetChainId.SN_SEPOLIA,
    baseChainId: 11155111,
    baseNetworkId: 'sep',
    rpcUrl: `https://starknet-sepolia.infura.io/v3/${import.meta.env.VITE_INFURA_API_KEY}`,
    ethRpcUrl: `https://sepolia.infura.io/v3/${import.meta.env.VITE_INFURA_API_KEY}`,
    apiUrl: import.meta.env.VITE_STARKNET_SEPOLIA_API ?? 'https://testnet-api-1.snapshotx.xyz',
    explorerUrl: 'https://sepolia.starkscan.co'
  }
};

export function createStarknetNetwork(networkId: NetworkID): Network {
  const metadata = METADATA[networkId];
  if (!metadata) throw new Error(`Unsupported network ${networkId}`);

  const { name, chainId, baseChainId, baseNetworkId, rpcUrl, ethRpcUrl, apiUrl, explorerUrl } =
    metadata;

  const provider = createProvider(rpcUrl);
  const api = createApi(apiUrl, networkId);
  const constants = createConstants(networkId, baseNetworkId);

  const helpers = {
    isAuthenticatorSupported: (authenticator: string) =>
      constants.SUPPORTED_AUTHENTICATORS[authenticator],
    isAuthenticatorContractSupported: (authenticator: string) =>
      constants.CONTRACT_SUPPORTED_AUTHENTICATORS[authenticator],
    getRelayerAuthenticatorType: (authenticator: string) =>
      constants.RELAYER_AUTHENTICATORS[authenticator],
    isStrategySupported: (strategy: string) => constants.SUPPORTED_STRATEGIES[strategy],
    isExecutorSupported: (executor: string) => constants.SUPPORTED_EXECUTORS[executor],
    isVotingTypeSupported: (type: string) => constants.EDITOR_VOTING_TYPES.includes(type),
    pin: pinPineapple,
    waitForTransaction: txId => {
      let retries = 0;

      return new Promise((resolve, reject) => {
        const timer = setInterval(async () => {
          let tx: Awaited<ReturnType<typeof provider.getTransactionReceipt>>;
          try {
            tx = await provider.getTransactionReceipt(txId);
          } catch (e) {
            if (retries > 20) {
              clearInterval(timer);
              reject();
            }

            retries++;

            return;
          }

          const successStates = [
            TransactionFinalityStatus.ACCEPTED_ON_L1,
            TransactionFinalityStatus.ACCEPTED_ON_L2
          ];

          if (successStates.includes(tx.finality_status as any)) {
            clearInterval(timer);
            resolve(tx);
          }

          if (tx.execution_status === TransactionExecutionStatus.REVERTED) {
            clearInterval(timer);
            reject(tx);
          }
        }, 2000);
      });
    },
    waitForSpace: (spaceAddress: string, interval = 5000): Promise<Space> =>
      new Promise(resolve => {
        const timer = setInterval(async () => {
          const space = await api.loadSpace(spaceAddress);
          if (space) {
            clearInterval(timer);
            resolve(space);
          }
        }, interval);
      }),
    getExplorerUrl: (id, type) => {
      let dataType: 'tx' | 'contract' | 'token' = 'tx';
      if (type === 'token') dataType = 'token';
      else if (['address', 'contract', 'strategy'].includes(type)) dataType = 'contract';

      return `${explorerUrl}/${dataType}/${id}`;
    }
  };

  return {
    name,
    avatar: 'ipfs://bafkreihbjafyh7eud7r6e5743esaamifcttsvbspfwcrfoc5ykodjdi67m',
    currentUnit: 'second',
    chainId,
    baseChainId,
    currentChainId: baseChainId,
    baseNetworkId,
    supportsSimulation: true,
    managerConnectors: STARKNET_CONNECTORS,
    actions: createActions(networkId, provider, helpers, {
      l1ChainId: baseChainId,
      ethUrl: ethRpcUrl
    }),
    api,
    constants,
    helpers
  };
}
