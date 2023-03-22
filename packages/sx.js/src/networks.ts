import type { NetworkConfig, EvmNetworkConfig } from './types';

export const evmGoerli: EvmNetworkConfig = {
  eip712ChainId: 5,
  proxyFactory: '0x12a1fffffd70677939d61d641ea043bc9060c718',
  masterSpace: '0xb5e5c8a9a999da1aabb2b45dc9f72f2be042e204',
  executionStrategiesImplementations: {
    SimpleQuorumAvatar: '0x6f12c67cad3e566b60a6ae0146761110f1ea6eb2'
  },
  authenticators: {
    '0x6896120fdf2d791e4dc1c673d8becd54b14dd607': {
      type: 'vanilla'
    },
    '0xc537d997ddc783e071f82ccbfaa0d768d310001b': {
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
    '0xf50bf15e9fe61e27625a4ecdfc23211297e8be85': {
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
