import { validateAndParseAddress } from 'starknet';
import { NetworkConfig } from './types';

function createStarknetConfig(
  networkId: keyof typeof starknetNetworks
): NetworkConfig {
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
            type: 'evmSlotValue'
          }
        } as const)
      : {}),
    ...(network.Strategies.OZVotesStorageProof
      ? ({
          [validateAndParseAddress(network.Strategies.OZVotesStorageProof)]: {
            type: 'ozVotesStorageProof',
            params: {
              trace: 224
            }
          }
        } as const)
      : {}),
    ...(network.Strategies.OZVotesTrace208StorageProof
      ? ({
          [validateAndParseAddress(
            network.Strategies.OZVotesTrace208StorageProof
          )]: {
            type: 'ozVotesStorageProof',
            params: {
              trace: 208
            }
          }
        } as const)
      : {})
  } as const;

  return {
    eip712ChainId: network.Meta.eip712ChainId,
    herodotusAccumulatesChainId: network.Meta.herodotusAccumulatesChainId,
    spaceFactory: network.Meta.spaceFactory,
    l1AvatarExecutionStrategyFactory:
      network.Meta.l1AvatarExecutionStrategyFactory,
    l1AvatarExecutionStrategyImplementation:
      network.Meta.l1AvatarExecutionStrategyImplementation,
    masterSpace: network.Meta.masterSpace,
    starknetCommit: network.Meta.starknetCommit,
    starknetCore: network.Meta.starknetCore,
    feeEstimateOverride: network.Meta.feeEstimateOverride,
    authenticators,
    strategies
  };
}

export const starknetNetworks = {
  sn: {
    Meta: {
      eip712ChainId: '0x534e5f4d41494e',
      herodotusAccumulatesChainId: 1,
      herodotusDeployedOnChain: 'STARKNET',
      spaceFactory:
        '0x0250e28c97e729842190c3672f9fcf8db0fc78b8080e87a894831dc69e4f4439',
      l1AvatarExecutionStrategyFactory:
        '0xf5a39d4708df26edb55ded7b184e52dac82b0dce',
      l1AvatarExecutionStrategyImplementation:
        '0xed2a6161948f57debd2865040b287bd70a6323aa',
      masterSpace:
        '0x00f20287bef9f46c6051e425a84094d2436bcc1fef804db353e60f93661961ac',
      starknetCommit: '0xf1ec7b0276aa5af11ecefe56efb0f198a77016e9',
      starknetCore: '0xc662c410C0ECf747543f5bA90660f6ABeBD9C8c4',
      feeEstimateOverride: process.env.STARKNET_MAINNET_FEE_ESTIMATE_OVERRIDE
    },
    Authenticators: {
      Vanilla:
        '0xc4b0a7d8626638e7dd410b16ccbc48fe36e68f864dec75b23ef41e3732d5d2',
      EthSig:
        '0xb610082a0f39458e03a96663767ec25d6fb259f32c1e0dd19bf2be7a52532c',
      EthTx:
        '0x63c89d1c6b938b68e88db2719cf2546a121c23642974c268515238b442b0ea0',
      StarkSig:
        '0x6e9de29d8c3551e7f845888f323e864ff214359b56a137633bf7e191035b442',
      StarkTx:
        '0x687b57bc5459d05d9575483be8ed8e623c379484fdb1aad18b073ffd4602099'
    },
    Strategies: {
      MerkleWhitelist:
        '0x528b83a6af52c56cb2134fd9190a441e930831af437c1cb0fa6e459ad1435ba',
      ERC20Votes:
        '0x2429becc80a90bbeb38c6566617c584f79c60f684e8e73313af58b109b7d637',
      EVMSlotValue:
        '0x699e53f4b40e19d96b8020386dbeeb156f40172d7bbb78b2a4204cf64ae75f',
      OZVotesStorageProof:
        '0x7ee3cf64f1072fe21570356eb57d4e9f78169ea9235ba610f60a8b33c36cc6e',
      OZVotesTrace208StorageProof: ''
    },
    ProposalValidations: {
      VotingPower:
        '0x1b28f95cbc5bcbe52014ef974d609f14497517f31d3c9e079a2464edf988751'
    },
    ExecutionStrategies: {
      EthRelayer:
        '0x076a6349d0338841581bc75b7fa7062f6cc23f6fca6a112ef8b8d5fbbaea7dd6',
      NoExecutionSimpleMajority:
        '0x180e1f4fcd875b35690b6771b30197867d39c893d5ba6e32c36616733ee37c4'
    }
  },
  'sn-sep': {
    Meta: {
      eip712ChainId: '0x534e5f5345504f4c4941',
      herodotusAccumulatesChainId: 11155111,
      herodotusDeployedOnChain: 'SN_SEPOLIA',
      spaceFactory:
        '0x302d332e9aceb184e5f301cb62c85181e7fc3b30559935c5736e987de579f6e',
      l1AvatarExecutionStrategyFactory:
        '0x27981A29Ec87f2FBF873a2dcb0325405648FfCe1',
      l1AvatarExecutionStrategyImplementation:
        '0xffEBbe7243cC6001cF44Dd10Bf3C1C7Cf678e215',
      masterSpace:
        '0x04b61126a7def0956cb4ff342ba72d850ea6b78b0ddb3e0b45f3a99bc9eb5995',
      starknetCommit: '0xf1ec7b0276aa5af11ecefe56efb0f198a77016e9',
      starknetCore: '0xE2Bb56ee936fd6433DC0F6e7e3b8365C906AA057',
      feeEstimateOverride: process.env.STARKNET_SEPOLIA_FEE_ESTIMATE_OVERRIDE
    },
    Authenticators: {
      Vanilla:
        '0x51a4a1eb5ce28fc95edf408a847efccfb030d27314d9fbe82d82cb998ec1a0b',
      EthSig:
        '0x53d98050a9738da0eac7498d909ea03f6eb03d07fb95877b54ff8acf7712276',
      EthTx:
        '0x47ee3743ce7ad0ffcdb1ba51c9730a77cafd0ca51539714e711258f86c9f8af',
      StarkSig:
        '0x213bb25044b189ccfda9882999dba32e011781dc11b2a6efa2b3d232824378e',
      StarkTx:
        '0x2b63a8a92b7c67484ab99c4307c7db41b15b9a3c33359cd2b2459fd7f543a9c'
    },
    Strategies: {
      MerkleWhitelist:
        '0x13bcbe7318fb8aa219d264dcf5916feb873e596389ba93d923f9a23378cb743',
      ERC20Votes:
        '0x72067addfebbaf2d20ed07303a2c9b8e19154e8797e6e9d6819b37fea2a2963',
      EVMSlotValue:
        '0x3aaf61f015076dae5580207672df6076c0ab7b4d339a13dbe10b1f6be932793',
      OZVotesStorageProof:
        '0x2713fd8af933632635212ac1217494b043c3e8ea58409433fa9273072191397',
      OZVotesTrace208StorageProof:
        '0x5ade144027c3d704256b83e96c92364c5fd7a85e72dd929f02effe47cf30962'
    },
    ProposalValidations: {
      VotingPower:
        '0x296e1a5ad28c9bf32b9570d6e1bedae77917866cd5d92aea4ef9271905ef549'
    },
    ExecutionStrategies: {
      EthRelayer:
        '0x06c921569a23bb182ea4791290b773dd090dfdb117cb98737b4f91c21ef38f0e',
      NoExecutionSimpleMajority:
        '0x5327bdc6522d531b7770cd51aa641fb91c280a30cdece29edbf9edd970167f6'
    }
  }
} as const;

export const starknetMainnet: NetworkConfig = createStarknetConfig('sn');
export const starknetSepolia: NetworkConfig = createStarknetConfig('sn-sep');
