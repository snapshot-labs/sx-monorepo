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
const baseNetwork = createEvmNetwork('base');
const mantleNetwork = createEvmNetwork('mnt');
const optimismNetwork = createEvmNetwork('oeth');
const ethereumNetwork = createEvmNetwork('eth');
const apeNetwork = createEvmNetwork('ape');
const curtisNetwork = createEvmNetwork('curtis');
const sepoliaNetwork = createEvmNetwork('sep');
const baseSepoliaNetwork = createEvmNetwork('base-sep');

export const enabledNetworks: NetworkID[] = import.meta.env
  .VITE_ENABLED_NETWORKS
  ? (import.meta.env.VITE_ENABLED_NETWORKS.split(',') as NetworkID[])
  : [
      's',
      's-tn',
      'eth',
      'matic',
      'arb1',
      'base',
      'mnt',
      'oeth',
      'ape',
      'curtis',
      'sep',
      'sn',
      'sn-sep',
      'base-sep'
    ];

export const evmNetworks: NetworkID[] = [
  'eth',
  'matic',
  'arb1',
  'mnt',
  'base',
  'oeth',
  'ape',
  'curtis',
  'sep',
  'base-sep'
];
export const offchainNetworks: NetworkID[] = ['s', 's-tn'];
export const starknetNetworks: NetworkID[] = ['sn', 'sn-sep'];
// This network is used for aliases/follows/profiles/explore page.
export const metadataNetwork: NetworkID =
  import.meta.env.VITE_METADATA_NETWORK || 's';

export const getNetwork = (id: NetworkID) => {
  if (!enabledNetworks.includes(id))
    throw new Error(`Network ${id} is not enabled`);

  if (id === 's') return snapshotNetwork;
  if (id === 's-tn') return snapshotTestnetNetwork;
  if (id === 'matic') return polygonNetwork;
  if (id === 'arb1') return arbitrumNetwork;
  if (id === 'base') return baseNetwork;
  if (id === 'mnt') return mantleNetwork;
  if (id === 'oeth') return optimismNetwork;
  if (id === 'eth') return ethereumNetwork;
  if (id === 'ape') return apeNetwork;
  if (id === 'curtis') return curtisNetwork;
  if (id === 'sep') return sepoliaNetwork;
  if (id === 'sn') return starknetNetwork;
  if (id === 'sn-sep') return starknetSepoliaNetwork;
  if (id === 'base-sep') return baseSepoliaNetwork;

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

export const explorePageProtocols: Record<ExplorePageProtocol, ProtocolConfig> =
  {
    snapshot: {
      key: 'snapshot',
      label: 'Snapshot',
      apiNetwork: metadataNetwork,
      networks: [metadataNetwork],
      limit: 18
    },
    'snapshot-x': {
      key: 'snapshot-x',
      label: 'Snapshot X',
      apiNetwork:
        enabledNetworks.find(network => !offchainNetworks.includes(network)) ||
        'eth',
      networks: enabledNetworks.filter(
        network => !offchainNetworks.includes(network)
      ),
      limit: 18
    }
  };
