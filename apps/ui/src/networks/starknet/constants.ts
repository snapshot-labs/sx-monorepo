import { CallData, uint256 } from 'starknet';
import { utils } from '@snapshot-labs/sx';
import { shorten } from '@/helpers/utils';
import { pinPineapple } from '@/helpers/pin';
import { StrategyConfig } from '../types';

import IHCode from '~icons/heroicons-outline/code';
import IHCube from '~icons/heroicons-outline/cube';
import IHPencil from '~icons/heroicons-outline/pencil';
import IHLightningBolt from '~icons/heroicons-outline/lightning-bolt';

export const API_URL = 'https://api-1.snapshotx.xyz';

export const SUPPORTED_AUTHENTICATORS = {
  '0x48b33fe56e9b9354d4278ffdd5f6d546b13aa3d8c33149db2e2e2fdb48a369e': true,
  '0xd6f14d3df9ea2db12ed9572ab41d527f18dd24192e1744d3c100b2cd470812': true,
  '0x5280813396bf63dd47531ccdbfa5887099d44421d3f62db3de8f7bed68794f5': true,
  '0x573a7fc4d8dd3a860b376741c251772cd4d15508dd94564ff23a645d28042d': true
};

export const CONTRACT_SUPPORTED_AUTHENTICATORS = {
  '0xd6f14d3df9ea2db12ed9572ab41d527f18dd24192e1744d3c100b2cd470812': true
};

export const SUPPORTED_STRATEGIES = {
  '0xe3ca14dcb7862116bbbe4331a9927c6693b141aa8936bb76e2bdfa4b551a52': true,
  '0x30258c0b5832763b16f4e5d2ddbf97b3d61b8ff3368a3e3f112533b8549dd29': true
};

export const SUPPORTED_EXECUTORS = {};

export const RELAYER_AUTHENTICATORS = {
  '0x5280813396bf63dd47531ccdbfa5887099d44421d3f62db3de8f7bed68794f5': 'starknet',
  '0x48b33fe56e9b9354d4278ffdd5f6d546b13aa3d8c33149db2e2e2fdb48a369e': 'evm',
  '0xd6f14d3df9ea2db12ed9572ab41d527f18dd24192e1744d3c100b2cd470812': 'evm-tx'
} as const;

export const AUTHS = {
  '0x48b33fe56e9b9354d4278ffdd5f6d546b13aa3d8c33149db2e2e2fdb48a369e': 'Ethereum signature',
  '0xd6f14d3df9ea2db12ed9572ab41d527f18dd24192e1744d3c100b2cd470812': 'Ethereum transaction',
  '0x5280813396bf63dd47531ccdbfa5887099d44421d3f62db3de8f7bed68794f5': 'Starknet signature',
  '0x573a7fc4d8dd3a860b376741c251772cd4d15508dd94564ff23a645d28042d': 'Starknet transaction'
};

export const PROPOSAL_VALIDATIONS = {
  '0x3ff398ab4e0aa9109c0cc889ff968c6215053a5e2176519b59f8ba87927c631': 'Voting power'
};

export const STRATEGIES = {
  '0xe3ca14dcb7862116bbbe4331a9927c6693b141aa8936bb76e2bdfa4b551a52': 'Merkle whitelist',
  '0x30258c0b5832763b16f4e5d2ddbf97b3d61b8ff3368a3e3f112533b8549dd29': 'ERC-20 Votes (EIP-5805)'
};

export const EXECUTORS = {
  NoExecutionSimpleMajority: 'No execution simple majority',
  EthRelayer: 'Eth relayer'
};

export const EDITOR_AUTHENTICATORS = [
  {
    address: '0x573a7fc4d8dd3a860b376741c251772cd4d15508dd94564ff23a645d28042d',
    name: 'Starknet transaction',
    about:
      'Will authenticate a user by checking if the caller address corresponds to the author or voter address.',
    icon: IHCube,
    paramsDefinition: null
  },
  {
    address: '0x5280813396bf63dd47531ccdbfa5887099d44421d3f62db3de8f7bed68794f5',
    name: 'Starknet signature',
    about: 'Will authenticate a user based on an EIP-712 message signed by a Starknet private key.',
    icon: IHPencil,
    paramsDefinition: null
  },
  {
    address: '0xd6f14d3df9ea2db12ed9572ab41d527f18dd24192e1744d3c100b2cd470812',
    name: 'Ethereum transaction',
    about:
      'Will authenticate a user by checking if the caller address of Ethereum transaction corresponds to the author or voter address.',
    icon: IHCube,
    paramsDefinition: null
  },
  {
    address: '0x48b33fe56e9b9354d4278ffdd5f6d546b13aa3d8c33149db2e2e2fdb48a369e',
    name: 'Ethereum signature',
    about:
      'Will authenticate a user based on an EIP-712 message signed by an Ethereum private key.',
    icon: IHPencil,
    paramsDefinition: null
  }
];

export const EDITOR_PROPOSAL_VALIDATIONS = [
  {
    address: '0x3ff398ab4e0aa9109c0cc889ff968c6215053a5e2176519b59f8ba87927c631',
    type: 'VotingPower',
    name: 'Voting power',
    icon: IHLightningBolt,
    validate: (params: Record<string, any>) => {
      return params?.strategies?.length > 0;
    },
    generateSummary: (params: Record<string, any>) => `(${params.threshold})`,
    generateParams: (params: Record<string, any>) => {
      const strategies = params.strategies.map((strategy: StrategyConfig) => {
        return {
          address: strategy.address,
          params: strategy.generateParams ? strategy.generateParams(strategy.params) : []
        };
      });

      return CallData.compile({
        threshold: uint256.bnToUint256(params.threshold),
        allowed_strategies: strategies
      });
    },
    generateMetadata: async (params: Record<string, any>) => {
      const strategiesMetadata = await Promise.all(
        params.strategies.map(async (strategy: StrategyConfig) => {
          if (!strategy.generateMetadata) return;

          const metadata = await strategy.generateMetadata(strategy.params);
          const pinned = await pinPineapple(metadata);

          return `ipfs://${pinned.cid}`;
        })
      );

      return {
        strategies_metadata: strategiesMetadata
      };
    },
    paramsDefinition: {
      type: 'object',
      title: 'Params',
      additionalProperties: false,
      required: ['threshold'],
      properties: {
        threshold: {
          type: 'integer',
          title: 'Proposal threshold',
          examples: ['1']
        }
      }
    }
  }
];

export const EDITOR_VOTING_STRATEGIES = [
  {
    address: '0xe3ca14dcb7862116bbbe4331a9927c6693b141aa8936bb76e2bdfa4b551a52',
    name: 'Whitelist',
    about:
      'A strategy that defines a list of addresses each with designated voting power, using a Merkle tree for verification.',
    generateSummary: (params: Record<string, any>) => {
      const length = params.whitelist.split('\n').length;

      return `(${length} ${length === 1 ? 'address' : 'addresses'})`;
    },
    generateParams: (params: Record<string, any>) => {
      const leaves = params.whitelist.split('\n').map((item: string) => {
        const [address, votingPower] = item.split(':');
        const type =
          address.length === 42
            ? utils.merkle.AddressType.ETHEREUM
            : utils.merkle.AddressType.STARKNET;

        return new utils.merkle.Leaf(type, address, BigInt(votingPower));
      });

      return [utils.merkle.generateMerkleRoot(leaves.map((leaf: utils.merkle.Leaf) => leaf.hash))];
    },
    generateMetadata: async (params: Record<string, any>) => {
      const tree = params.whitelist.split('\n').map((item: string) => {
        const [address, votingPower] = item.split(':');
        const type = address.length === 42 ? 1 : 0;

        return {
          type,
          address,
          votingPower: votingPower
        };
      });

      const pinned = await pinPineapple({ tree });

      return {
        name: 'Whitelist',
        properties: {
          symbol: params.symbol,
          decimals: 0,
          payload: `ipfs://${pinned.cid}`
        }
      };
    },
    paramsDefinition: {
      type: 'object',
      title: 'Params',
      additionalProperties: false,
      required: [],
      properties: {
        symbol: {
          type: 'string',
          maxLength: 6,
          title: 'Symbol',
          examples: ['e.g. VP']
        },
        whitelist: {
          type: 'string',
          format: 'long',
          title: 'Whitelist',
          examples: ['0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70:40']
        }
      }
    }
  },
  {
    address: '0x30258c0b5832763b16f4e5d2ddbf97b3d61b8ff3368a3e3f112533b8549dd29',
    name: 'ERC-20 Votes (EIP-5805)',
    about:
      'A strategy that allows delegated balances of OpenZeppelin style checkpoint tokens to be used as voting power.',
    icon: IHCode,
    generateSummary: (params: Record<string, any>) =>
      `(${shorten(params.contractAddress)}, ${params.decimals})`,
    generateParams: (params: Record<string, any>) => [params.contractAddress],
    generateMetadata: (params: Record<string, any>) => ({
      name: 'ERC-20 Votes (EIP-5805)',
      properties: {
        symbol: params.symbol,
        decimals: parseInt(params.decimals),
        token: params.contractAddress
      }
    }),
    paramsDefinition: {
      type: 'object',
      title: 'Params',
      additionalProperties: false,
      required: ['contractAddress', 'decimals'],
      properties: {
        contractAddress: {
          type: 'string',
          format: 'address',
          title: 'Token address',
          examples: ['0x0000…']
        },
        decimals: {
          type: 'integer',
          title: 'Decimals',
          examples: ['18']
        },
        symbol: {
          type: 'string',
          maxLength: 6,
          title: 'Symbol',
          examples: ['e.g. COMP']
        }
      }
    }
  }
];

export const EDITOR_EXECUTION_STRATEGIES = [
  {
    address: '0x4a5658d6b9fe62283147719a8b13d72f96e8959afacc716569b936c91089147',
    type: 'NoExecutionSimpleMajority',
    name: EXECUTORS.NoExecutionSimpleMajority,
    paramsDefinition: null
  }
];
