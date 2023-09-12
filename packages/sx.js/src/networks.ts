import type { NetworkConfig, EvmNetworkConfig } from './types';

export const evmGoerli: EvmNetworkConfig = {
  eip712ChainId: 5,
  proxyFactory: '0x4b4f7f64be813ccc66aefc3bfce2baa01188631c',
  masterSpace: '0xd9c46d5420434355d0e5ca3e3ccb20ce7a533964',
  executionStrategiesImplementations: {
    SimpleQuorumAvatar: '0x3813f3d97aa2f80e3af625605a31206e067fb2e5',
    SimpleQuorumTimelock: '0x00c5e67e6f7fdf80d7bca249e38c355fbe62ba34'
  },
  authenticators: {
    '0x5f9b7d78c9a37a439d78f801e0e339c6e711e260': {
      type: 'ethSig'
    },
    '0xba06e6ccb877c332181a6867c05c8b746a21aed1': {
      type: 'ethTx'
    }
  },
  strategies: {
    '0xc1245c5dca7885c73e32294140f1e5d30688c202': {
      type: 'vanilla'
    },
    '0x0c2de612982efd102803161fc7c74cca15db932c': {
      type: 'comp'
    },
    '0x2c8631584474e750cedf2fb6a904f2e84777aefe': {
      type: 'ozVotes'
    },
    '0x3cee21a33751a2722413ff62dec3dec48e7748a4': {
      type: 'whitelist'
    }
  }
};

export const evmSepolia: EvmNetworkConfig = {
  ...evmGoerli,
  eip712ChainId: 11155111
};

export const evmPolygon: EvmNetworkConfig = {
  ...evmGoerli,
  eip712ChainId: 137
};

export const evmArbitrum: EvmNetworkConfig = {
  ...evmGoerli,
  eip712ChainId: 42161
};

export const evmLineaGoerli: EvmNetworkConfig = {
  eip712ChainId: 59140,
  proxyFactory: '0x12a1fffffd70677939d61d641ea043bc9060c718',
  masterSpace: '0x7cc62f8e9bf2b44ce704d2cdcd4aa8021d5a6f4b',
  executionStrategiesImplementations: {
    SimpleQuorumAvatar: '0x177f163f8f789f0d9c5c7993728adb106a7b12d4',
    SimpleQuorumTimelock: '0xdb86512e7e3a2d0b93b74b8fe3ffe8ad780791be'
  },
  authenticators: {
    '0x3e3a68e0e70dbf78051109a9f379b7a7adec82f4': {
      type: 'ethSig'
    },
    '0xddb36b865a1021524b936fb29fcba5fac073db74': {
      type: 'ethTx'
    }
  },
  strategies: {
    '0xeba53160c146cbf77a150e9a218d4c2de5db6b51': {
      type: 'vanilla'
    },
    '0x343baf4b44f7f79b14301cfa8068e3f8be7470de': {
      type: 'comp'
    },
    '0x4aaa33b4367dc5657854bd40738201651ec0cc7b': {
      type: 'ozVotes'
    },
    '0x54449c058bbf0b777745944ea1a7b79786fbc958': {
      type: 'whitelist'
    }
  }
};

export const goerli1: NetworkConfig = {
  eip712ChainId: '0x534e5f474f45524c49',
  spaceFactory: '0x3b04349f509c875827a8f7532b63103cd02d07539f2075783f43acf282114ab',
  masterSpace: '0x31ba161238220dcca438d4ee5ceba75ea9dd67e410d4dde1b83f57fb43033e1',
  authenticators: {
    '0x06c363a572f7f86b58fff89abf6f924cb75e97a92af2b2acbdd0156ddd18761d': {
      type: 'vanilla'
    },
    '0x052a8c751db001ed116d2194521331426910cd800a656d57b575929e1058b35b': {
      type: 'starkTx'
    },
    '0x0256cd338bb24decbfaf05366b540c2b0fb9c504475d4b3baba01e6975cf2a6e': {
      type: 'starkSig'
    },
    '0x002c27791b44910c295e3fadaa4d3a9b095cefb5554f885f2362c40209978555': {
      type: 'ethTx'
    }
  },
  strategies: {
    '0x04ad4a117a2b047fc3e25bf52791bc8f29a0871ac3c41a3e176f18c8a1087815': {
      type: 'vanilla'
    },
    '0x02581d59cc3961ea2db43e7fca258823c01165b1455e91d4186255e14f7d540a': {
      type: 'erc20Votes'
    }
  }
};

export const goerli2: NetworkConfig = {
  eip712ChainId: '0x534e5f474f45524c4932',
  spaceFactory: '0x00e1e511e496a72791ab3d591ba7d571a32de4261d84e4d183f26b6325970e20',
  masterSpace: '',
  authenticators: {
    '0x05e1f273ca9a11f78bfb291cbe1b49294cf3c76dd48951e7ab7db6d9fb1e7d62': {
      type: 'vanilla'
    },
    '0x064cce9272197eba6353f5bbf060e097e516b411e66e83a9cf5910a08697df14': {
      type: 'ethSig'
    }
  },
  strategies: {
    '0x058623786b93d9b6ed1f83cec5c6fa6bea5f399d2795ee56a6123bdd83f5aa48': {
      type: 'vanilla'
    },
    '0x00d1b81feff3095ca9517fdfc7427e742ce96f7ca8f3b2664a21b2fba552493b': {
      type: 'singleSlotProof',
      params: {
        fossilL1HeadersStoreAddress:
          '0x69606dd1655fdbbf8189e88566c54890be8f7e4a3650398ac17f6586a4a336d',
        fossilFactRegistryAddress:
          '0x2e39818908f0da118fde6b88b52e4dbdf13d2e171e488507f40deb6811bde3f'
      }
    }
  }
};

export const defaultNetwork = goerli1;
