import { constants as starknetConstants } from 'starknet';
import {
  OffchainNetworkEthereumConfig,
  OffchainNetworkStarknetConfig
} from './types';

type EvmChainId = OffchainNetworkEthereumConfig['eip712ChainId'];
type StarknetChainId = OffchainNetworkStarknetConfig['eip712ChainId'];

function createStandardConfig<T>(eip712ChainId: T) {
  return {
    eip712ChainId
  };
}

export const offchainMainnet = createStandardConfig<EvmChainId>(1);
export const offchainGoerli = createStandardConfig<EvmChainId>(5);
export const offchainStarknetMainnet = createStandardConfig<StarknetChainId>(
  starknetConstants.StarknetChainId.SN_MAIN
);
export const offchainStarknetSepolia = createStandardConfig<StarknetChainId>(
  starknetConstants.StarknetChainId.SN_SEPOLIA
);
