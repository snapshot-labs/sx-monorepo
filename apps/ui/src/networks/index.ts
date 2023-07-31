import { createStarknetNetwork } from './starknet';
import { createEvmNetwork } from './evm';
import { NetworkID } from '@/types';

const starknetNetwork = createStarknetNetwork('sn-tn2');
const goerliNetwork = createEvmNetwork('gor');
const sepoliaNetwork = createEvmNetwork('sep');
const lineaTestnetNetwork = createEvmNetwork('linea-testnet');

export const enabledNetworks: NetworkID[] = ['gor', 'sep'];

export const evmNetworks: NetworkID[] = ['gor', 'sep', 'linea-testnet'];

export const getNetwork = (id: NetworkID) => {
  if (id === 'gor') return goerliNetwork;
  if (id === 'sep') return sepoliaNetwork;
  if (id === 'linea-testnet') return lineaTestnetNetwork;
  if (id === 'sn-tn2') return starknetNetwork;

  throw new Error(`Unknown network ${id}`);
};
