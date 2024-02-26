import type { OffchainNetworkConfig } from './types';

function createStandardConfig(eip712ChainId: OffchainNetworkConfig['eip712ChainId']) {
  return {
    eip712ChainId
  };
}

export const offchainMainnet = createStandardConfig(1);
export const offchainGoerli = createStandardConfig(5);
