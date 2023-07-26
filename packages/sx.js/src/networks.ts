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

export const goerli2: NetworkConfig = {
  eip712ChainId: 5,
  spaceFactory: '0x00e1e511e496a72791ab3d591ba7d571a32de4261d84e4d183f26b6325970e20',
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
  },
  executors: {
    '1': {
      type: 'starknet'
    },
    '0x4ecc83848a519cc22b0d0ffb70e65ec8dde85d3d13439eff7145d4063cf6b4d': {
      type: 'vanilla'
    },
    '0x21dda40770f4317582251cffd5a0202d6b223dc167e5c8db25dc887d11eba81': {
      type: 'ethRelayer',
      params: {
        destination: '0x196F0548E3140D2C7f6532a206dd54FbC12232a4',
        chainId: 5
      }
    }
  }
};

export const defaultNetwork = goerli2;
