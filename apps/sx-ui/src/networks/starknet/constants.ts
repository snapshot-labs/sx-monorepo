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
  '0x6584c1eacea3c9721242ea4a795cfd4d63be30943d9686a64bfedf04765cd5c': true,
  '0x204546a6d59f757677506cb6e6b031dd0f4990613ce6e9212a2e76c67a7dc54': true,
  '0xb321c09ee9851c125bd4213de71ebd03c07813556bae5d4700968df42ee476': true,
  '0x53c66d5b61f7b7f8a3871908b16d6e199ed401b706fb042a006d53f97ec2958': true
};

export const CONTRACT_SUPPORTED_AUTHENTICATORS = {
  '0x204546a6d59f757677506cb6e6b031dd0f4990613ce6e9212a2e76c67a7dc54': true
};

export const SUPPORTED_STRATEGIES = {
  '0x510d1e6d386a2adcfc6f2a57f80c4c4268baeccbd4a09334e843b17ce9225ee': true,
  '0x297fb0104d8be6c86f168bf1dcdc28b0625d2b06108c3c46194aa4415f2e2ec': true,
  '0x619040eb54857252396d0bf337dc7a7f98182fa015c11578201105038106cb7': true
};

export const SUPPORTED_EXECUTORS = {};

export const RELAYER_AUTHENTICATORS = {
  '0xb321c09ee9851c125bd4213de71ebd03c07813556bae5d4700968df42ee476': 'starknet',
  '0x6584c1eacea3c9721242ea4a795cfd4d63be30943d9686a64bfedf04765cd5c': 'evm',
  '0x204546a6d59f757677506cb6e6b031dd0f4990613ce6e9212a2e76c67a7dc54': 'evm-tx'
} as const;

export const AUTHS = {
  '0x6584c1eacea3c9721242ea4a795cfd4d63be30943d9686a64bfedf04765cd5c': 'Ethereum signature',
  '0x204546a6d59f757677506cb6e6b031dd0f4990613ce6e9212a2e76c67a7dc54': 'Ethereum transaction',
  '0xb321c09ee9851c125bd4213de71ebd03c07813556bae5d4700968df42ee476': 'Starknet signature',
  '0x53c66d5b61f7b7f8a3871908b16d6e199ed401b706fb042a006d53f97ec2958': 'Starknet transaction'
};

export const PROPOSAL_VALIDATIONS = {
  '0x38f034f17941669555fca61c43c67a517263aaaab833b26a1ab877a21c0bb6d': 'Voting power'
};

export const STRATEGIES = {
  '0x510d1e6d386a2adcfc6f2a57f80c4c4268baeccbd4a09334e843b17ce9225ee': 'Vanilla',
  '0x297fb0104d8be6c86f168bf1dcdc28b0625d2b06108c3c46194aa4415f2e2ec': 'Merkle whitelist',
  '0x619040eb54857252396d0bf337dc7a7f98182fa015c11578201105038106cb7': 'ERC-20 Votes (EIP-5805)'
};

export const EXECUTORS = {
  SimpleQuorumVanilla: 'Vanilla',
  EthRelayer: 'Eth relayer'
};

export const EDITOR_AUTHENTICATORS = [
  {
    address: '0x53c66d5b61f7b7f8a3871908b16d6e199ed401b706fb042a006d53f97ec2958',
    name: 'Starknet transaction',
    about:
      'Will authenticate a user by checking if the caller address corresponds to the author or voter address.',
    icon: IHCube,
    paramsDefinition: null
  },
  {
    address: '0xb321c09ee9851c125bd4213de71ebd03c07813556bae5d4700968df42ee476',
    name: 'Starknet signature',
    about: 'Will authenticate a user based on an EIP-712 message signed by a Starknet private key.',
    icon: IHPencil,
    paramsDefinition: null
  },
  {
    address: '0x204546a6d59f757677506cb6e6b031dd0f4990613ce6e9212a2e76c67a7dc54',
    name: 'Ethereum transaction',
    about:
      'Will authenticate a user by checking if the caller address of Ethereum transaction corresponds to the author or voter address.',
    icon: IHCube,
    paramsDefinition: null
  },
  {
    address: '0x6584c1eacea3c9721242ea4a795cfd4d63be30943d9686a64bfedf04765cd5c',
    name: 'Ethereum signature',
    about:
      'Will authenticate a user based on an EIP-712 message signed by an Ethereum private key.',
    icon: IHPencil,
    paramsDefinition: null
  }
];

export const EDITOR_PROPOSAL_VALIDATIONS = [
  {
    address: '0x38f034f17941669555fca61c43c67a517263aaaab833b26a1ab877a21c0bb6d',
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
    address: '0x510d1e6d386a2adcfc6f2a57f80c4c4268baeccbd4a09334e843b17ce9225ee',
    name: 'Vanilla',
    about:
      'A strategy that gives one voting power to anyone. It should only be used for testing purposes and not in production.',
    generateMetadata: (params: Record<string, any>) => ({
      name: 'Vanilla',
      properties: {
        symbol: params.symbol,
        decimals: 0
      }
    }),
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
        }
      }
    }
  },
  {
    address: '0x297fb0104d8be6c86f168bf1dcdc28b0625d2b06108c3c46194aa4415f2e2ec',
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
    address: '0x619040eb54857252396d0bf337dc7a7f98182fa015c11578201105038106cb7',
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
    address: '0x767ea1ecd66d29468a04518041af4b0835da7c219e3f2e85f68af666acdb162',
    type: 'SimpleQuorumVanilla',
    name: EXECUTORS.SimpleQuorumVanilla,
    paramsDefinition: null
  }
];
