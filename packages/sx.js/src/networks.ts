import type { NetworkConfig, EvmNetworkConfig } from './types';

export const evmGoerli: EvmNetworkConfig = {
  eip712ChainId: 5,
  proxyFactory: '',
  masterSpace: '',
  executionStrategiesImplementations: {
    SimpleQuorumAvatar: ''
  },
  authenticators: {
    '0xdd66652e93293c32aa3288509d9a46c785e3f786': {
      type: 'vanilla'
    },
    '0x277f388b77cd36fff1c0e976c49a7c54413a449a': {
      type: 'ethSig'
    },
    '0xcc3fb327de5428d182ba2e739aea5978c0e2ce35': {
      type: 'ethTx'
    }
  },
  strategies: {
    '0xf3e55d22845689be3e062975444d09799e522a6c': {
      type: 'vanilla'
    },
    '0x0bed117707f698fccb68223de297bf3e3df7082c': {
      type: 'comp'
    },
    '0x95287283ed7c583120b06ff48a655062976ac41c': {
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
