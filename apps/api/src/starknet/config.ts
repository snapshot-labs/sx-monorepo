import { CheckpointConfig } from '@snapshot-labs/checkpoint';
import { starknetNetworks } from '@snapshot-labs/sx';
import { validateAndParseAddress } from 'starknet';
import { DEFAULT_INFURA_API_KEY } from '../config';
import spaceAbi from './abis/space.json';
import spaceFactoryAbi from './abis/spaceFactory.json';

const snNetworkNodeUrl =
  process.env.NETWORK_NODE_URL_SN ||
  `https://starknet-mainnet.infura.io/v3/${DEFAULT_INFURA_API_KEY}`;
const snSepNetworkNodeUrl =
  process.env.NETWORK_NODE_URL_SN_SEP ||
  `https://starknet-sepolia.infura.io/v3/${DEFAULT_INFURA_API_KEY}`;
const manaRpcUrl = process.env.VITE_MANA_URL || 'https://mana.box';

export type FullConfig = {
  indexerName: 'sn' | 'sn-sep';
  overrides: ReturnType<typeof createOverrides>;
} & CheckpointConfig;

const CONFIG = {
  sn: {
    indexerName: 'sn',
    networkNodeUrl: snNetworkNodeUrl,
    l1NetworkNodeUrl: 'https://rpc.brovider.xyz/1',
    contract: starknetNetworks['sn'].Meta.spaceFactory,
    start: 445498,
    verifiedSpaces: [
      '0x009fedaf0d7a480d21a27683b0965c0f8ded35b3f1cac39827a25a06a8a682a4',
      '0x05ea5ef0c54c84dc7382629684c6e536c0b06246b3b0981c426b42372e3ef263',
      '0x07c251045154318a2376a3bb65be47d3c90df1740d8e35c9b9d943aa3f240e50',
      '0x07bd3419669f9f0cc8f19e9e2457089cdd4804a4c41a5729ee9c7fd02ab8ab62'
    ]
  },
  'sn-sep': {
    indexerName: 'sn-sep',
    networkNodeUrl: snSepNetworkNodeUrl,
    l1NetworkNodeUrl: 'https://rpc.brovider.xyz/11155111',
    contract: starknetNetworks['sn-sep'].Meta.spaceFactory,
    start: 17960,
    verifiedSpaces: [
      '0x0141464688e48ae5b7c83045edb10ecc242ce0e1ad4ff44aca3402f7f47c1ab9'
    ]
  }
};

function createOverrides(networkId: keyof typeof CONFIG) {
  const config = starknetNetworks[networkId];

  return {
    networkNodeUrl: CONFIG[networkId].networkNodeUrl,
    l1NetworkNodeUrl: CONFIG[networkId].l1NetworkNodeUrl,
    manaRpcUrl: `${manaRpcUrl}/stark_rpc/${config.Meta.eip712ChainId}`,
    baseChainId: config.Meta.herodotusAccumulatesChainId,
    erc20VotesStrategy: config.Strategies.ERC20Votes,
    propositionPowerValidationStrategyAddress:
      config.ProposalValidations.VotingPower,
    spaceClassHash: config.Meta.masterSpace,
    verifiedSpaces: CONFIG[networkId].verifiedSpaces,
    herodotusStrategies: [
      config.Strategies.OZVotesStorageProof,
      config.Strategies.OZVotesTrace208StorageProof,
      config.Strategies.EVMSlotValue
    ]
      .filter(address => !!address)
      .map(strategy => validateAndParseAddress(strategy))
  };
}

export function createConfig(indexerName: keyof typeof CONFIG): FullConfig {
  const { networkNodeUrl, contract, start } = CONFIG[indexerName];

  const overrides = createOverrides(indexerName);

  return {
    indexerName,
    overrides,
    network_node_url: networkNodeUrl,
    optimistic_indexing: true,
    sources: [
      {
        contract,
        start,
        abi: 'SpaceFactory',
        events: [
          {
            name: 'NewContractDeployed',
            fn: 'handleContractDeployed'
          }
        ]
      }
    ],
    templates: {
      Space: {
        abi: 'Space',
        events: [
          {
            name: 'SpaceCreated',
            fn: 'handleSpaceCreated'
          },
          {
            name: 'ProposalCreated',
            fn: 'handlePropose'
          },
          {
            name: 'ProposalCancelled',
            fn: 'handleCancel'
          },
          {
            name: 'ProposalUpdated',
            fn: 'handleUpdate'
          },
          {
            name: 'ProposalExecuted',
            fn: 'handleExecute'
          },
          {
            name: 'VoteCast',
            fn: 'handleVote'
          },
          {
            name: 'MetadataUriUpdated',
            fn: 'handleMetadataUriUpdated'
          },
          {
            name: 'MinVotingDurationUpdated',
            fn: 'handleMinVotingDurationUpdated'
          },
          {
            name: 'MaxVotingDurationUpdated',
            fn: 'handleMaxVotingDurationUpdated'
          },
          {
            name: 'VotingDelayUpdated',
            fn: 'handleVotingDelayUpdated'
          },
          {
            name: 'OwnershipTransferred',
            fn: 'handleOwnershipTransferred'
          },
          {
            name: 'AuthenticatorsAdded',
            fn: 'handleAuthenticatorsAdded'
          },
          {
            name: 'AuthenticatorsRemoved',
            fn: 'handleAuthenticatorsRemoved'
          },
          {
            name: 'VotingStrategiesAdded',
            fn: 'handleVotingStrategiesAdded'
          },
          {
            name: 'VotingStrategiesRemoved',
            fn: 'handleVotingStrategiesRemoved'
          },
          {
            name: 'ProposalValidationStrategyUpdated',
            fn: 'handleProposalValidationStrategyUpdated'
          }
        ]
      }
    },
    abis: {
      SpaceFactory: spaceFactoryAbi,
      Space: spaceAbi
    }
  };
}
