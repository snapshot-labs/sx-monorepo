import { CheckpointConfig } from '@snapshot-labs/checkpoint';
import { evmNetworks } from '@snapshot-labs/sx';
import GovernorEvents from './abis/GovernorEvents';
import TimelockController from './abis/TimelockController';
import { GOVERNANCES } from './governances';
import { GovernorBravoConfig, NetworkID } from '../../types';

type Config = Pick<CheckpointConfig, 'sources' | 'templates' | 'abis'> & {
  protocolConfig: GovernorBravoConfig;
};

export function createConfig(indexerName: NetworkID): Config | null {
  const network = evmNetworks[indexerName];

  const governance = GOVERNANCES[indexerName];
  if (!governance) return null;

  const sources = Object.values(governance).map(governance => ({
    contract: governance.address,
    start: governance.startBlock,
    abi: 'GovernorEvents',
    events: [
      {
        name: 'ProposalCreated(uint256,address,address[],uint256[],string[],bytes[],uint256,uint256,string)',
        fn: 'handleProposalCreated'
      },
      {
        name: 'VoteCast(address,uint256,uint8,uint256,string)',
        fn: 'handleVoteCast'
      },
      {
        name: 'ProposalCanceled(uint256)',
        fn: 'handleProposalCanceled'
      },
      {
        name: 'ProposalQueued(uint256,uint256)',
        fn: 'handleProposalQueued'
      },
      {
        name: 'ProposalExecuted(uint256)',
        fn: 'handleProposalExecuted'
      },
      // GovernorSettings
      {
        name: 'ProposalThresholdSet(uint256,uint256)',
        fn: 'handleProposalThresholdSet'
      },
      {
        name: 'VotingDelaySet(uint256,uint256)',
        fn: 'handleVotingDelaySet'
      },
      {
        name: 'VotingPeriodSet(uint256,uint256)',
        fn: 'handleVotingPeriodSet'
      },
      // GovernorTimelockControl
      {
        name: 'TimelockChange(address,address)',
        fn: 'handleTimelockChange'
      }
    ]
  }));

  return {
    sources,
    templates: {
      OpenZeppelinTimelockController: {
        abi: 'TimelockController',
        events: [
          {
            name: 'MinDelayChange(uint256,uint256)',
            fn: 'handleNewDelay'
          }
        ]
      }
    },
    abis: {
      GovernorEvents,
      TimelockController
    },
    protocolConfig: {
      chainId: network.Meta.eip712ChainId
    }
  };
}
