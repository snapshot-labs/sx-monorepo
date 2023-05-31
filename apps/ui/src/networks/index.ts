import { createStarknetNetwork } from './starknet';
import { createEvmNetwork } from './evm';
import type { NetworkID } from '@/types';

const starknetNetwork = createStarknetNetwork('sn-tn2');
const goerliNetwork = createEvmNetwork('gor');

export const enabledNetworks: NetworkID[] = ['gor'];

export const evmNetworks: NetworkID[] = ['gor'];

export const getNetwork = (id: NetworkID) => {
  if (id === 'gor') return goerliNetwork;
  if (id === 'sn-tn2') return starknetNetwork;

  throw new Error(`Unknown network ${id}`);
};
