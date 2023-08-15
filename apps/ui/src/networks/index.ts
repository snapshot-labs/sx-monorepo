import { createStarknetNetwork } from './starknet';
import { createEvmNetwork } from './evm';
import { NetworkID } from '@/types';

const starknetNetwork = createStarknetNetwork('sn-tn2');
const polygonNetwork = createEvmNetwork('matic');
const arbitrumNetwork = createEvmNetwork('arb1');
const goerliNetwork = createEvmNetwork('gor');
const sepoliaNetwork = createEvmNetwork('sep');
const lineaTestnetNetwork = createEvmNetwork('linea-testnet');

export const enabledNetworks: NetworkID[] = ['matic', 'arb1', 'gor', 'sep'];

export const evmNetworks: NetworkID[] = ['matic', 'arb1', 'gor', 'sep', 'linea-testnet'];

export const getNetwork = (id: NetworkID) => {
  if (id === 'matic') return polygonNetwork;
  if (id === 'arb1') return arbitrumNetwork;
  if (id === 'gor') return goerliNetwork;
  if (id === 'sep') return sepoliaNetwork;
  if (id === 'linea-testnet') return lineaTestnetNetwork;
  if (id === 'sn-tn2') return starknetNetwork;

  throw new Error(`Unknown network ${id}`);
};
