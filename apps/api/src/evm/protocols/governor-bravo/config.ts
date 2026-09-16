import { CheckpointConfig } from '@snapshot-labs/checkpoint';
import { evmNetworks } from '@snapshot-labs/sx';
import GovernorModule from './abis/GovernorModule';
import Timelock from './abis/Timelock';
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
    abi: 'GovernorModule',
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
      {
        name: 'ProposalThresholdSet(uint256, uint256)',
        fn: 'handleProposalThresholdSet'
      },
      {
        name: 'NewAdmin(address,address)',
        fn: 'handleNewAdmin'
      }
    ]
  }));

  return {
    sources,
    templates: {
      Timelock: {
        abi: 'Timelock',
        events: [
          {
            name: 'NewDelay(uint256)',
            fn: 'handleNewDelay'
          }
        ]
      }
    },
    abis: {
      GovernorModule,
      Timelock
    },
    protocolConfig: {
      chainId: network.Meta.eip712ChainId
    }
  };
}
