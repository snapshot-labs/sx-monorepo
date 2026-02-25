import { constants as starknetConstants } from 'starknet';
import { API_TESTNET_URL, API_URL } from '@/helpers/constants';
import { NetworkID } from '@/types';

type Metadata = {
  name: string;
  chainId: starknetConstants.StarknetChainId;
  baseChainId: number;
  baseNetworkId: NetworkID;
  rpcUrl: string;
  ethRpcUrl: string;
  explorerUrl: string;
  apiUrl: string;
  avatar: string;
};

export const METADATA: Partial<Record<NetworkID, Metadata>> = {
  sn: {
    name: 'Starknet',
    chainId: starknetConstants.StarknetChainId.SN_MAIN,
    baseChainId: 1,
    baseNetworkId: 'eth',
    rpcUrl: 'https://rpc.snapshot.org/sn',
    ethRpcUrl: 'https://rpc.snapshot.org/1',
    apiUrl: API_URL,
    explorerUrl: 'https://voyager.online',
    avatar: 'ipfs://bafkreihbjafyh7eud7r6e5743esaamifcttsvbspfwcrfoc5ykodjdi67m'
  },
  'sn-sep': {
    name: 'Starknet Sepolia',
    chainId: starknetConstants.StarknetChainId.SN_SEPOLIA,
    baseChainId: 11155111,
    baseNetworkId: 'sep',
    rpcUrl: 'https://rpc.snapshot.org/sn-sep',
    ethRpcUrl: 'https://rpc.snapshot.org/11155111',
    apiUrl: API_TESTNET_URL,
    explorerUrl: 'https://sepolia.voyager.online',
    avatar: 'ipfs://bafkreihbjafyh7eud7r6e5743esaamifcttsvbspfwcrfoc5ykodjdi67m'
  }
};
