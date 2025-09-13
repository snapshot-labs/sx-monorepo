import { constants as starknetConstants } from 'starknet';
import { OffchainNetworkConfig } from './types';

function createStandardConfig(
  eip712ChainId: OffchainNetworkConfig['eip712ChainId']
) {
  return {
    eip712ChainId
  };
}

export const offchainMainnet = createStandardConfig(1);
export const offchainGoerli = createStandardConfig(5);
export const offchainStarknetMainnet = createStandardConfig(
  starknetConstants.StarknetChainId.SN_MAIN
);
export const offchainStarknetSepolia = createStandardConfig(
  starknetConstants.StarknetChainId.SN_SEPOLIA
);
