import { CheckpointConfig } from '@snapshot-labs/checkpoint';
import { evmNetworks } from '@snapshot-labs/sx';
import GovernorModule from './abis/GovernorModule';
import Timelock from './abis/Timelock';
import { GovernorBravoConfig, NetworkID } from '../../types';

const START_BLOCKS: Partial<Record<NetworkID, number>> = {
  eth: 12006099,
  sep: 9025765
};

const MODULE_ADDRESSES: Partial<Record<NetworkID, string[]>> = {
  eth: [
    // Compound Governor
    '0xc0Da02939E1441F497fd74F78cE7Decb17B66529',
    // Uniswap Governor
    '0x408ED6354d4973f66138C91495F2f2FCbd8724C3',
    // InstaDapp
    '0x0204Cd037B2ec03605CFdFe482D8e257C765fA1B',
    // Rari Capital
    '0x91d9c2b5cF81D55a5f2Ecc0fC84E62f9cd2ceFd6',
    // Ampleforth
    '0x8a994C6F55Be1fD2B4d0dc3B8f8F7D4E3a2dA8F1'
  ],
  sep: ['0x69112D158A607DD388034c0C09242FF966985258']
};

type Config = Pick<CheckpointConfig, 'sources' | 'templates' | 'abis'> & {
  protocolConfig: GovernorBravoConfig;
};

export function createConfig(indexerName: NetworkID): Config | null {
  const network = evmNetworks[indexerName];

  const start = START_BLOCKS[indexerName];
  const contracts = MODULE_ADDRESSES[indexerName];
  if (!start || !contracts) return null;

  const sources = contracts.map(contract => ({
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
