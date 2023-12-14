import type { NetworkConfig, EvmNetworkConfig } from './types';

export const evmMainnet: EvmNetworkConfig = {
  eip712ChainId: 1,
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
    '0x34f0afff5a739bbf3e285615f50e40ddaaf2a829': {
      type: 'whitelist'
    }
  }
};

export const evmGoerli: EvmNetworkConfig = {
  ...evmMainnet,
  eip712ChainId: 5,
  masterSpace: '0xc3031a7d3326e47d49bff9d374d74f364b29ce4d',
  executionStrategiesImplementations: {
    SimpleQuorumAvatar: '0xece4f6b01a2d7ff5a9765ca44162d453fc455e42',
    SimpleQuorumTimelock: '0xf2a1c2f2098161af98b2cc7e382ab7f3ba86ebc4'
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

export const starknetMainnet: NetworkConfig = {
  eip712ChainId: '0x534e5f4d41494e',
  herodotusAccumulatesChainId: 1,
  spaceFactory: '0x0250e28c97e729842190c3672f9fcf8db0fc78b8080e87a894831dc69e4f4439',
  masterSpace: '0x00f20287bef9f46c6051e425a84094d2436bcc1fef804db353e60f93661961ac',
  starknetCommit: '0xf1ec7b0276aa5af11ecefe56efb0f198a77016e9',
  authenticators: {
    '0x00c4b0a7d8626638e7dd410b16ccbc48fe36e68f864dec75b23ef41e3732d5d2': {
      type: 'vanilla'
    },
    '0x0687b57bc5459d05d9575483be8ed8e623c379484fdb1aad18b073ffd4602099': {
      type: 'starkTx'
    },
    '0x06e9de29d8c3551e7f845888f323e864ff214359b56a137633bf7e191035b442': {
      type: 'starkSig'
    },
    '0x063c89d1c6b938b68e88db2719cf2546a121c23642974c268515238b442b0ea0': {
      type: 'ethTx'
    },
    '0x00b610082a0f39458e03a96663767ec25d6fb259f32c1e0dd19bf2be7a52532c': {
      type: 'ethSig'
    }
  },
  strategies: {
    '0x0528b83a6af52c56cb2134fd9190a441e930831af437c1cb0fa6e459ad1435ba': {
      type: 'whitelist'
    },
    '0x02429becc80a90bbeb38c6566617c584f79c60f684e8e73313af58b109b7d637': {
      type: 'erc20Votes'
    }
  }
};

export const starknetGoerli1: NetworkConfig = {
  eip712ChainId: '0x534e5f474f45524c49',
  herodotusAccumulatesChainId: 5,
  spaceFactory: '0x063c62258e1ba4d9ad72eab809ea5c3d1a4545b721bc444d6068ced6246c2f3c',
  masterSpace: '0x00f20287bef9f46c6051e425a84094d2436bcc1fef804db353e60f93661961ac',
  starknetCommit: '0x8bf85537c80becba711447f66a9a4452e3575e29',
  authenticators: {
    '0x046ad946f22ac4e14e271f24309f14ac36f0fde92c6831a605813fefa46e0893': {
      type: 'vanilla'
    },
    '0x00573a7fc4d8dd3a860b376741c251772cd4d15508dd94564ff23a645d28042d': {
      type: 'starkTx'
    },
    '0x05280813396bf63dd47531ccdbfa5887099d44421d3f62db3de8f7bed68794f5': {
      type: 'starkSig'
    },
    '0x00d6f14d3df9ea2db12ed9572ab41d527f18dd24192e1744d3c100b2cd470812': {
      type: 'ethTx'
    },
    '0x048b33fe56e9b9354d4278ffdd5f6d546b13aa3d8c33149db2e2e2fdb48a369e': {
      type: 'ethSig'
    }
  },
  strategies: {
    '0x00e3ca14dcb7862116bbbe4331a9927c6693b141aa8936bb76e2bdfa4b551a52': {
      type: 'whitelist'
    },
    '0x030258c0b5832763b16f4e5d2ddbf97b3d61b8ff3368a3e3f112533b8549dd29': {
      type: 'erc20Votes'
    },
    '0x035dbd4e4f46a059557e1b299d17f4568b49488bad5da9a003b171d90052139e': {
      type: 'evmSlotValue',
      params: {
        deployedOnChain: 'SN_GOERLI'
      }
    }
  }
};

export const defaultNetwork = starknetGoerli1;
