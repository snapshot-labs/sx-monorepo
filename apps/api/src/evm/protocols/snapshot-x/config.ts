import { CheckpointConfig } from '@snapshot-labs/checkpoint';
import { evmNetworks } from '@snapshot-labs/sx';
import AxiomExecutionStrategy from './abis/AxiomExecutionStrategy';
import L1AvatarExecutionStrategy from './abis/L1AvatarExecutionStrategy';
import L1AvatarExecutionStrategyFactory from './abis/L1AvatarExecutionStrategyFactory';
import ProxyFactory from './abis/ProxyFactory';
import SimpleQuorumAvatarExecutionStrategy from './abis/SimpleQuorumAvatarExecutionStrategy';
import SimpleQuorumTimelockExecutionStrategy from './abis/SimpleQuorumTimelockExecutionStrategy';
import Space from './abis/Space';
import { MANA_URL } from '../../../config';
import { NetworkID, SnapshotXConfig } from '../../types';

const START_BLOCKS: Record<NetworkID, number> = {
  eth: 18962278,
  sep: 9532004,
  oeth: 118359200,
  matic: 50858232,
  arb1: 157825417,
  base: 23524251,
  mnt: 75662182,
  ape: 12100384,
  curtis: 16682282
};

type Config = Pick<CheckpointConfig, 'sources' | 'templates' | 'abis'> & {
  protocolConfig: SnapshotXConfig;
};

export function createConfig(networkId: NetworkID): Config {
  const network = evmNetworks[networkId];

  const sources = [
    {
      contract: network.Meta.proxyFactory,
      start: START_BLOCKS[networkId],
      abi: 'ProxyFactory',
      events: [
        {
          name: 'ProxyDeployed(address,address)',
          fn: 'handleProxyDeployed'
        }
      ]
    }
  ];

  if (networkId === 'sep') {
    sources.push({
      contract: '0x27981a29ec87f2fbf873a2dcb0325405648ffce1',
      start: 9532004,
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
            name: 'OwnershipTransferred(address,address)',
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
          },
          {
            name: 'QuorumUpdated(uint256)',
            fn: 'handleQuorumUpdated'
          }
        ]
      },
      SimpleQuorumAvatarExecutionStrategy: {
        abi: 'SimpleQuorumAvatarExecutionStrategy',
        events: [
          {
            name: 'QuorumUpdated(uint256)',
            fn: 'handleQuorumUpdated'
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
      SimpleQuorumAvatarExecutionStrategy,
      SimpleQuorumTimelockExecutionStrategy,
      AxiomExecutionStrategy,
      L1AvatarExecutionStrategy,
      L1AvatarExecutionStrategyFactory
    },
    protocolConfig: {
      chainId: network.Meta.eip712ChainId,
      manaRpcUrl: `${MANA_URL}/eth_rpc/${network.Meta.eip712ChainId}`,
      masterSpace: network.Meta.masterSpace,
      masterSimpleQuorumAvatar: network.ExecutionStrategies.SimpleQuorumAvatar,
      masterSimpleQuorumTimelock:
        network.ExecutionStrategies.SimpleQuorumTimelock,
      masterAxiom: network.ExecutionStrategies.Axiom,
      propositionPowerValidationStrategyAddress:
        network.ProposalValidations.VotingPower,
      apeGasStrategy: network.Strategies.ApeGas ?? null,
      apeGasStrategyDelay: 20 * 5 // 20 minutes, with 5 blocks per minute
    }
  };
}
