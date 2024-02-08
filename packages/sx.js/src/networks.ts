import { validateAndParseAddress } from 'starknet';
import { NetworkConfig, EvmNetworkConfig } from './types';

export const evmMainnet: EvmNetworkConfig = {
  eip712ChainId: 1,
  proxyFactory: '0x4b4f7f64be813ccc66aefc3bfce2baa01188631c',
  masterSpace: '0xc3031a7d3326e47d49bff9d374d74f364b29ce4d',
  executionStrategiesImplementations: {
    SimpleQuorumAvatar: '0xece4f6b01a2d7ff5a9765ca44162d453fc455e42',
    SimpleQuorumTimelock: '0xf2a1c2f2098161af98b2cc7e382ab7f3ba86ebc4'
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
  eip712ChainId: 5
};

export const evmSepolia: EvmNetworkConfig = {
  ...evmGoerli,
  eip712ChainId: 11155111,
  executionStrategiesImplementations: {
    ...evmGoerli.executionStrategiesImplementations,
    Axiom: '0xE59405D7d40df064E85FD02a4F2F2C527172a9c1',
    Isokratia: '0xc674eCf233920aa3052738BFCDbDd0812AEE5A83'
  }
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

export const starknetNetworks = {
  sn: {
    Meta: {
      eip712ChainId: '0x534e5f4d41494e',
      herodotusAccumulatesChainId: 1,
      herodotusDeployedOnChain: 'STARKNET',
      spaceFactory: '0x0250e28c97e729842190c3672f9fcf8db0fc78b8080e87a894831dc69e4f4439',
      masterSpace: '0x00f20287bef9f46c6051e425a84094d2436bcc1fef804db353e60f93661961ac',
      starknetCommit: '0xf1ec7b0276aa5af11ecefe56efb0f198a77016e9'
    },
    Authenticators: {
      Vanilla: '0xc4b0a7d8626638e7dd410b16ccbc48fe36e68f864dec75b23ef41e3732d5d2',
      EthSig: '0xb610082a0f39458e03a96663767ec25d6fb259f32c1e0dd19bf2be7a52532c',
      EthTx: '0x63c89d1c6b938b68e88db2719cf2546a121c23642974c268515238b442b0ea0',
      StarkSig: '0x6e9de29d8c3551e7f845888f323e864ff214359b56a137633bf7e191035b442',
      StarkTx: '0x687b57bc5459d05d9575483be8ed8e623c379484fdb1aad18b073ffd4602099'
    },
    Strategies: {
      MerkleWhitelist: '0x528b83a6af52c56cb2134fd9190a441e930831af437c1cb0fa6e459ad1435ba',
      ERC20Votes: '0x2429becc80a90bbeb38c6566617c584f79c60f684e8e73313af58b109b7d637',
      EVMSlotValue: '0x699e53f4b40e19d96b8020386dbeeb156f40172d7bbb78b2a4204cf64ae75f',
      OZVotesStorageProof: '0x7ee3cf64f1072fe21570356eb57d4e9f78169ea9235ba610f60a8b33c36cc6e'
    },
    ProposalValidations: {
      VotingPower: '0x1b28f95cbc5bcbe52014ef974d609f14497517f31d3c9e079a2464edf988751'
    },
    ExecutionStrategies: {
      NoExecutionSimpleMajority: '0x180e1f4fcd875b35690b6771b30197867d39c893d5ba6e32c36616733ee37c4'
    }
  },
  'sn-tn': {
    Meta: {
      eip712ChainId: '0x534e5f474f45524c49',
      herodotusAccumulatesChainId: 5,
      herodotusDeployedOnChain: 'SN_GOERLI',
      spaceFactory: '0x063c62258e1ba4d9ad72eab809ea5c3d1a4545b721bc444d6068ced6246c2f3c',
      masterSpace: '0x00f20287bef9f46c6051e425a84094d2436bcc1fef804db353e60f93661961ac',
      starknetCommit: '0x8bf85537c80becba711447f66a9a4452e3575e29'
    },
    Authenticators: {
      Vanilla: '0x46ad946f22ac4e14e271f24309f14ac36f0fde92c6831a605813fefa46e0893',
      EthSig: '0x48b33fe56e9b9354d4278ffdd5f6d546b13aa3d8c33149db2e2e2fdb48a369e',
      EthTx: '0xd6f14d3df9ea2db12ed9572ab41d527f18dd24192e1744d3c100b2cd470812',
      StarkSig: '0x5280813396bf63dd47531ccdbfa5887099d44421d3f62db3de8f7bed68794f5',
      StarkTx: '0x573a7fc4d8dd3a860b376741c251772cd4d15508dd94564ff23a645d28042d'
    },
    Strategies: {
      MerkleWhitelist: '0xe3ca14dcb7862116bbbe4331a9927c6693b141aa8936bb76e2bdfa4b551a52',
      ERC20Votes: '0x30258c0b5832763b16f4e5d2ddbf97b3d61b8ff3368a3e3f112533b8549dd29',
      EVMSlotValue: '0x35dbd4e4f46a059557e1b299d17f4568b49488bad5da9a003b171d90052139e',
      OZVotesStorageProof: '0x1b3cbb267de6d0f30ddf521cd385a2e11836f0c5ba6f7b2224cf77a6ed86acf'
    },
    ProposalValidations: {
      VotingPower: '0x3ff398ab4e0aa9109c0cc889ff968c6215053a5e2176519b59f8ba87927c631'
    },
    ExecutionStrategies: {
      NoExecutionSimpleMajority: '0x4a5658d6b9fe62283147719a8b13d72f96e8959afacc716569b936c91089147'
    }
  },
  'sn-sep': {
    Meta: {
      eip712ChainId: '0x534e5f5345504f4c4941',
      herodotusAccumulatesChainId: 11155111,
      herodotusDeployedOnChain: 'SN_SEPOLIA',
      spaceFactory: '0x302d332e9aceb184e5f301cb62c85181e7fc3b30559935c5736e987de579f6e',
      masterSpace: '0x04b61126a7def0956cb4ff342ba72d850ea6b78b0ddb3e0b45f3a99bc9eb5995',
      starknetCommit: '0xf1ec7b0276aa5af11ecefe56efb0f198a77016e9'
    },
    Authenticators: {
      Vanilla: '0x51a4a1eb5ce28fc95edf408a847efccfb030d27314d9fbe82d82cb998ec1a0b',
      EthSig: '0x53d98050a9738da0eac7498d909ea03f6eb03d07fb95877b54ff8acf7712276',
      EthTx: '0x47ee3743ce7ad0ffcdb1ba51c9730a77cafd0ca51539714e711258f86c9f8af',
      StarkSig: '0x213bb25044b189ccfda9882999dba32e011781dc11b2a6efa2b3d232824378e',
      StarkTx: '0x2b63a8a92b7c67484ab99c4307c7db41b15b9a3c33359cd2b2459fd7f543a9c'
    },
    Strategies: {
      MerkleWhitelist: '0x13bcbe7318fb8aa219d264dcf5916feb873e596389ba93d923f9a23378cb743',
      ERC20Votes: '0x72067addfebbaf2d20ed07303a2c9b8e19154e8797e6e9d6819b37fea2a2963',
      EVMSlotValue: '0x1f8544918b5d9b4833fb2ba2d0c7ceb0d699ae7f2b8b23ea129c9a10fe8046c',
      OZVotesStorageProof: '0x6df976878be613837f120529c6f630374f1fd65a9bd4ffdbc2b0f135b5edd2e'
    },
    ProposalValidations: {
      VotingPower: '0x296e1a5ad28c9bf32b9570d6e1bedae77917866cd5d92aea4ef9271905ef549'
    },
    ExecutionStrategies: {
      NoExecutionSimpleMajority: '0x5327bdc6522d531b7770cd51aa641fb91c280a30cdece29edbf9edd970167f6'
    }
  }
} as const;

function createStarknetConfig(networkId: keyof typeof starknetNetworks): NetworkConfig {
  const network = starknetNetworks[networkId];

  const authenticators = {
    [validateAndParseAddress(network.Authenticators.Vanilla)]: {
      type: 'vanilla'
    },
    [validateAndParseAddress(network.Authenticators.EthSig)]: {
      type: 'ethSig'
    },
    [validateAndParseAddress(network.Authenticators.EthTx)]: {
      type: 'ethTx'
    },
    [validateAndParseAddress(network.Authenticators.StarkSig)]: {
      type: 'starkSig'
    },
    [validateAndParseAddress(network.Authenticators.StarkTx)]: {
      type: 'starkTx'
    }
  } as const;

  const strategies = {
    [validateAndParseAddress(network.Strategies.MerkleWhitelist)]: {
      type: 'whitelist'
    },
    [validateAndParseAddress(network.Strategies.ERC20Votes)]: {
      type: 'erc20Votes'
    },
    ...(network.Strategies.EVMSlotValue
      ? ({
          [validateAndParseAddress(network.Strategies.EVMSlotValue)]: {
            type: 'evmSlotValue',
            params: {
              deployedOnChain: network.Meta.herodotusDeployedOnChain
            }
          }
        } as const)
      : {}),
    ...(network.Strategies.OZVotesStorageProof
      ? ({
          [validateAndParseAddress(network.Strategies.OZVotesStorageProof)]: {
            type: 'ozVotesStorageProof',
            params: {
              deployedOnChain: network.Meta.herodotusDeployedOnChain
            }
          }
        } as const)
      : {})
  } as const;

  return {
    eip712ChainId: network.Meta.eip712ChainId,
    herodotusAccumulatesChainId: network.Meta.herodotusAccumulatesChainId,
    spaceFactory: network.Meta.spaceFactory,
    masterSpace: network.Meta.masterSpace,
    starknetCommit: network.Meta.starknetCommit,
    authenticators,
    strategies
  };
}

export const starknetMainnet: NetworkConfig = createStarknetConfig('sn');
export const starknetGoerli: NetworkConfig = createStarknetConfig('sn-tn');
export const starknetSepolia: NetworkConfig = createStarknetConfig('sn-sep');

export const defaultNetwork = starknetGoerli;
