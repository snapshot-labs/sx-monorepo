import { createStarknetNetwork } from './starknet';
import { createEvmNetwork } from './evm';
import { createOffchainNetwork } from './offchain';
import { NetworkID } from '@/types';
import { ReadWriteNetwork } from './types';

const snapshotNetwork = createOffchainNetwork('s');
const snapshotTestnetNetwork = createOffchainNetwork('s-tn');
const starknetNetwork = createStarknetNetwork('sn');
const starknetTestnetNetwork = createStarknetNetwork('sn-tn');
const starknetSepoliaNetwork = createStarknetNetwork('sn-sep');
const polygonNetwork = createEvmNetwork('matic');
const arbitrumNetwork = createEvmNetwork('arb1');
const optimismNetwork = createEvmNetwork('oeth');
const ethereumNetwork = createEvmNetwork('eth');
const goerliNetwork = createEvmNetwork('gor');
const sepoliaNetwork = createEvmNetwork('sep');
const lineaTestnetNetwork = createEvmNetwork('linea-testnet');

export const enabledNetworks: NetworkID[] = import.meta.env.VITE_ENABLED_NETWORKS
  ? (import.meta.env.VITE_ENABLED_NETWORKS.split(',') as NetworkID[])
  : ['s', 's-tn', 'eth', 'matic', 'arb1', 'oeth', 'gor', 'sep', 'sn', 'sn-sep'];

export const evmNetworks: NetworkID[] = [
  'eth',
  'matic',
  'arb1',
  'oeth',
  'gor',
  'sep',
  'linea-testnet'
];
export const offchainNetworks: NetworkID[] = ['s', 's-tn'];

export const getNetwork = (id: NetworkID) => {
  if (!enabledNetworks.includes(id)) throw new Error(`Network ${id} is not enabled`);

  if (id === 's') return snapshotNetwork;
  if (id === 's-tn') return snapshotTestnetNetwork;
  if (id === 'matic') return polygonNetwork;
  if (id === 'arb1') return arbitrumNetwork;
  if (id === 'oeth') return optimismNetwork;
  if (id === 'eth') return ethereumNetwork;
  if (id === 'gor') return goerliNetwork;
  if (id === 'sep') return sepoliaNetwork;
  if (id === 'linea-testnet') return lineaTestnetNetwork;
  if (id === 'sn') return starknetNetwork;
  if (id === 'sn-tn') return starknetTestnetNetwork;
  if (id === 'sn-sep') return starknetSepoliaNetwork;

  throw new Error(`Unknown network ${id}`);
};

export const getReadWriteNetwork = (id: NetworkID): ReadWriteNetwork => {
  const network = getNetwork(id);
  if (network.readOnly) throw new Error(`Network ${id} is read-only`);

  return network;
};

export const enabledReadWriteNetworks: NetworkID[] = enabledNetworks.filter(
  id => !getNetwork(id).readOnly
);

/**
 * supportsNullCurrent return true if the network supports null current to be used for computing current voting power
 * @param networkId Network ID
 * @returns boolean true if the network supports null current
 */
export const supportsNullCurrent = (networkID: NetworkID) => {
  return !evmNetworks.includes(networkID);
};
