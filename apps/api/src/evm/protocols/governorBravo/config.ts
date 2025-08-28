import { CheckpointConfig } from '@snapshot-labs/checkpoint';
import { evmNetworks } from '@snapshot-labs/sx';
import GovernorModule from './abis/GovernorModule.json';
import Timelock from './abis/Timelock.json';
import { GovernorBravoConfig, NetworkID } from '../../types';

const START_BLOCKS: Partial<Record<NetworkID, number>> = {
  eth: 22590664,
  sep: 9025765
};

const MODULE_ADDRESSES: Partial<Record<NetworkID, string>> = {
  eth: '0x408ed6354d4973f66138c91495f2f2fcbd8724c3',
  sep: '0x69112d158a607dd388034c0c09242ff966985258'
};

type Config = Pick<CheckpointConfig, 'sources' | 'templates' | 'abis'> & {
  protocolConfig: GovernorBravoConfig;
};

export function createConfig(indexerName: NetworkID): Config | null {
  const network = evmNetworks[indexerName];

  const start = START_BLOCKS[indexerName];
  const contract = MODULE_ADDRESSES[indexerName];
  if (!start || !contract) return null;

  const sources = [
    {
      contract,
      start,
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
    }
  ];

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
