import { CheckpointConfig } from '@snapshot-labs/checkpoint';
import { evmNetworks } from '@snapshot-labs/sx';
import GovernorModule from './abis/GovernorModule.json';
import { GovernorBravoConfig, NetworkID } from '../../types';

const START_BLOCKS: Partial<Record<NetworkID, number>> = {
  eth: 22590664
};

type Config = Pick<CheckpointConfig, 'sources' | 'templates' | 'abis'> & {
  protocolConfig: GovernorBravoConfig;
};

export function createConfig(indexerName: NetworkID): Config | null {
  const network = evmNetworks[indexerName];

  const start = START_BLOCKS[indexerName];
  if (!start) return null;

  const sources = [
    {
      contract: '0x408ed6354d4973f66138c91495f2f2fcbd8724c3',
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
        }
      ]
    }
  ];

  return {
    sources,
    abis: {
      GovernorModule
    },
    protocolConfig: {
      chainId: network.Meta.eip712ChainId
    }
  };
}
