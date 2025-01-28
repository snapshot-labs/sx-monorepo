import { CheckpointConfig } from '@snapshot-labs/checkpoint';
import { evmNetworks } from '@snapshot-labs/sx';
import proxyFactoryAbi from './abis/ProxyFactory.json';
import spaceAbi from './abis/Space.json';
import { DEFAULT_INFURA_API_KEY } from '../config';

export type FullConfig = {
  indexerName: 'sep';
  chainId: number;
  overrides: {
    masterSpace: string;
    masterSimpleQuorumAvatar: string;
    masterSimpleQuorumTimelock: string;
    masterAxiom: string | null;
    propositionPowerValidationStrategyAddress: string;
  };
} & CheckpointConfig;

export function createConfig(indexerName: 'sep'): FullConfig {
  const network = evmNetworks[indexerName];

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
    network_node_url: `https://sepolia.infura.io/v3/${DEFAULT_INFURA_API_KEY}`,
    sources: [
      {
        contract: network.Meta.proxyFactory,
        start: 7554313,
        abi: 'ProxyFactory',
        events: [
          {
            name: 'ProxyDeployed(address,address)',
            fn: 'handleProxyDeployed'
          }
        ]
      }
    ],
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
      }
    },
    abis: {
      ProxyFactory: proxyFactoryAbi,
      Space: spaceAbi
    }
  };
}
