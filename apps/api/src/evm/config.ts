import { CheckpointConfig } from '@snapshot-labs/checkpoint';
import { evmNetworks } from '@snapshot-labs/sx';
import AxiomExecutionStrategy from './abis/AxiomExecutionStrategy.json';
import L1AvatarExecutionStrategy from './abis/L1AvatarExecutionStrategy.json';
import L1AvatarExecutionStrategyFactory from './abis/L1AvatarExecutionStrategyFactory.json';
import ProxyFactory from './abis/ProxyFactory.json';
import SimpleQuorumTimelockExecutionStrategy from './abis/SimpleQuorumTimelockExecutionStrategy.json';
import Space from './abis/Space.json';

type NetworkID =
  | 'eth'
  | 'sep'
  | 'oeth'
  | 'matic'
  | 'arb1'
  | 'base'
  | 'mnt'
  | 'apechain'
  | 'curtis';

const START_BLOCKS: Record<NetworkID, number> = {
  eth: 18962278,
  sep: 4519171,
  oeth: 118359200,
  matic: 50858232,
  arb1: 157825417,
  base: 23524251,
  mnt: 75662182,
  apechain: 12100384,
  curtis: 16682282
};

export type FullConfig = {
  indexerName: NetworkID;
  chainId: number;
  overrides: {
    masterSpace: string;
    masterSimpleQuorumAvatar: string;
    masterSimpleQuorumTimelock: string;
    masterAxiom: string | null;
    propositionPowerValidationStrategyAddress: string;
  };
} & CheckpointConfig;

export function createConfig(indexerName: NetworkID): FullConfig {
  const network = evmNetworks[indexerName];

  const sources = [
    {
      contract: network.Meta.proxyFactory,
      start: START_BLOCKS[indexerName],
      abi: 'ProxyFactory',
      events: [
        {
          name: 'ProxyDeployed(address,address)',
          fn: 'handleProxyDeployed'
        }
      ]
    }
  ];

  if (indexerName === 'sep') {
    sources.push({
      contract: '0x27981a29ec87f2fbf873a2dcb0325405648ffce1',
      start: 6106288,
      abi: 'L1AvatarExecutionStrategyFactory',
      events: [
        {
          name: 'ContractDeployed(address)',
          fn: 'handleL1AvatarExecutionContractDeployed'
        }
      ]
    });
  }

  return {
    indexerName,
    chainId: network.Meta.eip712ChainId,
    overrides: {
      masterSpace: network.Meta.masterSpace,
      masterSimpleQuorumAvatar: network.ExecutionStrategies.SimpleQuorumAvatar,
      masterSimpleQuorumTimelock:
        network.ExecutionStrategies.SimpleQuorumTimelock,
      masterAxiom: network.ExecutionStrategies.Axiom,
      propositionPowerValidationStrategyAddress:
        network.ProposalValidations.VotingPower
    },
    network_node_url: `https://rpc.snapshot.org/${network.Meta.eip712ChainId}`,
    sources,
    templates: {
      Space: {
        abi: 'Space',
        events: [
          {
            name: 'SpaceCreated(address,(address,uint32,uint32,uint32,(address,bytes),string,string,string,(address,bytes)[],string[],address[]))',
            fn: 'handleSpaceCreated'
          },
          {
            name: 'MetadataURIUpdated(string)',
            fn: 'handleMetadataUriUpdated'
          },
          {
            name: 'MinVotingDurationUpdated(uint32)',
            fn: 'handleMinVotingDurationUpdated'
          },
          {
            name: 'MaxVotingDurationUpdated(uint32)',
            fn: 'handleMaxVotingDurationUpdated'
          },
          {
            name: 'VotingDelayUpdated(uint32)',
            fn: 'handleVotingDelayUpdated'
          },
          {
            name: 'OwnershipTransferred(indexed address,indexed address)',
            fn: 'handleOwnershipTransferred'
          },
          {
            name: 'AuthenticatorsAdded(address[])',
            fn: 'handleAuthenticatorsAdded'
          },
          {
            name: 'AuthenticatorsRemoved(address[])',
            fn: 'handleAuthenticatorsRemoved'
          },
          {
            name: 'VotingStrategiesAdded((address,bytes)[],string[])',
            fn: 'handleVotingStrategiesAdded'
          },
          {
            name: 'VotingStrategiesRemoved(uint8[])',
            fn: 'handleVotingStrategiesRemoved'
          },
          {
            name: 'ProposalValidationStrategyUpdated((address,bytes),string)',
            fn: 'handleProposalValidationStrategyUpdated'
          },
          {
            name: 'ProposalCreated(uint256,address,(address,uint32,address,uint32,uint32,uint8,bytes32,uint256),string,bytes)',
            fn: 'handleProposalCreated'
          },
          {
            name: 'ProposalCancelled(uint256)',
            fn: 'handleProposalCancelled'
          },
          {
            name: 'ProposalUpdated(uint256,(address,bytes),string)',
            fn: 'handleProposalUpdated'
          },
          {
            name: 'ProposalExecuted(uint256)',
            fn: 'handleProposalExecuted'
          },
          {
            name: 'VoteCast(uint256,address,uint8,uint256)',
            fn: 'handleVoteCast'
          },
          {
            name: 'VoteCastWithMetadata(uint256,address,uint8,uint256,string)',
            fn: 'handleVoteCast'
          }
        ]
      },
      SimpleQuorumTimelockExecutionStrategy: {
        abi: 'SimpleQuorumTimelockExecutionStrategy',
        events: [
          {
            name: 'ProposalExecuted(bytes32)',
            fn: 'handleTimelockProposalExecuted'
          },
          {
            name: 'ProposalVetoed(bytes32)',
            fn: 'handleTimelockProposalVetoed'
          }
        ]
      },
      AxiomExecutionStrategy: {
        abi: 'AxiomExecutionStrategy',
        events: [
          {
            name: 'WriteOffchainVotes(uint256,uint256,uint256,uint256,uint256)',
            fn: 'handleAxiomWriteOffchainVotes'
          }
        ]
      },
      L1AvatarExecutionStrategy: {
        abi: 'L1AvatarExecutionStrategy',
        events: [
          {
            name: 'ProposalExecuted(uint256,uint256)',
            fn: 'handleStarknetProposalExecuted'
          }
        ]
      }
    },
    abis: {
      ProxyFactory,
      Space,
      SimpleQuorumTimelockExecutionStrategy,
      AxiomExecutionStrategy,
      L1AvatarExecutionStrategy,
      L1AvatarExecutionStrategyFactory
    }
  };
}
