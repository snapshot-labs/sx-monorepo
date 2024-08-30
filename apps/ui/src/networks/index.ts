import { NetworkID } from '@/types';
import { createEvmNetwork } from './evm';
import { createOffchainNetwork } from './offchain';
import { createStarknetNetwork } from './starknet';
import { ExplorePageProtocol, ProtocolConfig, ReadWriteNetwork } from './types';

const snapshotNetwork = createOffchainNetwork('s');
const snapshotTestnetNetwork = createOffchainNetwork('s-tn');
const starknetNetwork = createStarknetNetwork('sn');
const starknetSepoliaNetwork = createStarknetNetwork('sn-sep');
const polygonNetwork = createEvmNetwork('matic');
const arbitrumNetwork = createEvmNetwork('arb1');
const optimismNetwork = createEvmNetwork('oeth');
const ethereumNetwork = createEvmNetwork('eth');
const sepoliaNetwork = createEvmNetwork('sep');
const bnbNetwork = createEvmNetwork('bsc');
const gnosisNetwork = createEvmNetwork('xdai');
const fantomNetwork = createEvmNetwork('fantom');
const baseNetwork = createEvmNetwork('base');
const lineaTestnetNetwork = createEvmNetwork('linea-testnet');

export const enabledNetworks: NetworkID[] = import.meta.env
  .VITE_ENABLED_NETWORKS
  ? (import.meta.env.VITE_ENABLED_NETWORKS.split(',') as NetworkID[])
  : ['s', 's-tn', 'eth', 'matic', 'arb1', 'oeth', 'sep', 'sn', 'sn-sep'];

export const evmNetworks: NetworkID[] = [
  'eth',
  'matic',
  'arb1',
  'oeth',
  'sep',
  'linea-testnet',
  'bsc',
  'xdai',
  'fantom',
  'base'
];
export const offchainNetworks: NetworkID[] = ['s', 's-tn'];
export const starknetNetworks: NetworkID[] = ['sn', 'sn-sep'];
// This network is used for aliases/follows/profiles/explore page.
export const metadataNetwork: NetworkID =
  import.meta.env.VITE_METADATA_NETWORK || 's';

export const getNetwork = (id: NetworkID, allowDisabledNetwork = false) => {
  if (!enabledNetworks.includes(id) && !allowDisabledNetwork)
    throw new Error(`Network ${id} is not enabled`);

  if (id === 's') return snapshotNetwork;
  if (id === 's-tn') return snapshotTestnetNetwork;
  if (id === 'matic') return polygonNetwork;
  if (id === 'arb1') return arbitrumNetwork;
  if (id === 'oeth') return optimismNetwork;
  if (id === 'eth') return ethereumNetwork;
  if (id === 'sep') return sepoliaNetwork;
  if (id === 'linea-testnet') return lineaTestnetNetwork;
  if (id === 'sn') return starknetNetwork;
  if (id === 'sn-sep') return starknetSepoliaNetwork;
  if (id === 'bsc') return bnbNetwork;
  if (id === 'xdai') return gnosisNetwork;
  if (id === 'fantom') return fantomNetwork;
  if (id === 'base') return baseNetwork;

  throw new Error(`Unknown network ${id}`);
};

export const getReadWriteNetwork = (
  id: NetworkID,
  allowDisabledNetwork = false
): ReadWriteNetwork => {
  const network = getNetwork(id, allowDisabledNetwork);
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

export const DEFAULT_SPACES_LIMIT = 1000;

export const explorePageProtocols: Record<ExplorePageProtocol, ProtocolConfig> =
  {
    snapshot: {
      key: 'snapshot',
      label: 'Snapshot',
      networks: [metadataNetwork],
      limit: 18
    },
    snapshotx: {
      key: 'snapshotx',
      label: 'Snapshot X',
      networks: enabledNetworks.filter(
        network => !offchainNetworks.includes(network)
      ),
      limit: DEFAULT_SPACES_LIMIT
    }
  };
