import { AbiCoder } from '@ethersproject/abi';
import { clients } from '@snapshot-labs/sx';
import { shorten } from '@/helpers/utils';
import type { Signer } from '@ethersproject/abstract-signer';
import type { StrategyConfig } from '../types';

import IHCode from '~icons/heroicons-outline/code';
import IHBeaker from '~icons/heroicons-outline/beaker';
import IHCube from '~icons/heroicons-outline/cube';
import IHPencil from '~icons/heroicons-outline/pencil';
import IHClock from '~icons/heroicons-outline/clock';
import IHUserCircle from '~icons/heroicons-outline/user-circle';
import IHLightningBolt from '~icons/heroicons-outline/lightning-bolt';

export const SUPPORTED_AUTHENTICATORS = {
  '0xba06e6ccb877c332181a6867c05c8b746a21aed1': true,
  '0x5f9b7d78c9a37a439d78f801e0e339c6e711e260': true
};

export const SUPPORTED_STRATEGIES = {
  '0xc1245c5dca7885c73e32294140f1e5d30688c202': true,
  '0x0c2de612982efd102803161fc7c74cca15db932c': true,
  '0x2c8631584474e750cedf2fb6a904f2e84777aefe': true,
  '0x3cee21a33751a2722413ff62dec3dec48e7748a4': true
};

export const SUPPORTED_EXECUTORS = {
  SimpleQuorumAvatar: true,
  SimpleQuorumTimelock: true
};

export const RELAYER_AUTHENTICATORS = {
  '0x5f9b7d78c9a37a439d78f801e0e339c6e711e260': true
};

export const AUTHS = {
  '0x5f9b7d78c9a37a439d78f801e0e339c6e711e260': 'Ethereum signature',
  '0xba06e6ccb877c332181a6867c05c8b746a21aed1': 'Ethereum transaction'
};

export const PROPOSAL_VALIDATIONS = {
  '0x6d9d6d08ef6b26348bd18f1fc8d953696b7cf311': 'Voting power'
};

export const STRATEGIES = {
  '0xc1245c5dca7885c73e32294140f1e5d30688c202': 'Vanilla',
  '0x0c2de612982efd102803161fc7c74cca15db932c': 'Delegated Comp Token',
  '0x2c8631584474e750cedf2fb6a904f2e84777aefe': 'OpenZeppelin Votes',
  '0x3cee21a33751a2722413ff62dec3dec48e7748a4': 'Whitelist'
};

export const EXECUTORS = {
  SimpleQuorumAvatar: 'Avatar',
  SimpleQuorumTimelock: 'Timelock'
};

export const EDITOR_AUTHENTICATORS = [
  {
    address: '0xba06e6ccb877c332181a6867c05c8b746a21aed1',
    name: 'Ethereum transaction',
    about:
      'Will authenticate a user by checking if the caller address corresponds to the author or voter address.',
    icon: IHCube,
    paramsDefinition: null
  },
  {
    address: '0x5f9b7d78c9a37a439d78f801e0e339c6e711e260',
    name: 'Ethereum signature',
    about:
      'Will authenticate a user based on an EIP-712 message signed by an Ethereum private key.',
    icon: IHPencil,
    paramsDefinition: null
  }
];

export const EDITOR_PROPOSAL_VALIDATIONS = [
  {
    address: '0x6d9d6d08ef6b26348bd18f1fc8d953696b7cf311',
    type: 'VotingPower',
    name: 'Voting power',
    icon: IHLightningBolt,
    validate: (params: Record<string, any>) => {
      return params?.strategies?.length > 0;
    },
    generateSummary: (params: Record<string, any>) => `(${params.threshold})`,
    generateParams: (params: Record<string, any>) => {
      const abiCoder = new AbiCoder();

      const strategies = params.strategies.map((strategy: StrategyConfig) => {
        return {
          addr: strategy.address,
          params: strategy.generateParams ? strategy.generateParams(strategy.params)[0] : '0x00'
        };
      });

      return [
        abiCoder.encode(
          ['uint256', 'tuple(address addr, bytes params)[]'],
          [params.threshold, strategies]
        )
      ];
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
    address: '0xc1245c5dca7885c73e32294140f1e5d30688c202',
    name: 'Vanilla',
    about:
      'A strategy that gives one voting power to anyone. It should only be used for testing purposes and not in production.',
    icon: IHBeaker,
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
    address: '0x0c2de612982efd102803161fc7c74cca15db932c',
    name: 'Delegated Comp Token',
    about:
      'A strategy that allows delegated balances of Compound style checkpoint tokens to be used as voting power.',
    icon: IHCode,
    generateSummary: (params: Record<string, any>) =>
      `(${shorten(params.contractAddress)}, ${params.decimals})`,
    generateParams: (params: Record<string, any>) => [params.contractAddress],
    generateMetadata: (params: Record<string, any>) => ({
      name: 'Delegated Comp Token',
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
  },
  {
    address: '0x2c8631584474e750cedf2fb6a904f2e84777aefe',
    name: 'OpenZeppelin Votes',
    about:
      'A strategy that allows delegated balances of OpenZeppelin style checkpoint tokens to be used as voting power.',
    icon: IHCode,
    generateSummary: (params: Record<string, any>) =>
      `(${shorten(params.contractAddress)}, ${params.decimals})`,
    generateParams: (params: Record<string, any>) => [params.contractAddress],
    generateMetadata: (params: Record<string, any>) => ({
      name: 'OpenZeppelin Votes',
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
    address: '',
    type: 'SimpleQuorumAvatar',
    name: 'Safe module (Zodiac)',
    about:
      'An execution strategy that allows proposals to execute transactions from a specified target Avatar contract, the most popular one being a Safe.',
    icon: IHUserCircle,
    generateSummary: (params: Record<string, any>) =>
      `(${params.quorum}, ${shorten(params.contractAddress)})`,
    deploy: async (
      client: clients.EvmEthereumTx,
      signer: Signer,
      controller: string,
      spaceAddress: string,
      params: Record<string, any>
    ): Promise<{ address: string; txId: string }> => {
      return client.deployAvatarExecution({
        signer,
        params: {
          controller,
          target: params.contractAddress,
          spaces: [spaceAddress],
          quorum: BigInt(params.quorum)
        }
      });
    },
    paramsDefinition: {
      type: 'object',
      title: 'Params',
      additionalProperties: false,
      required: ['quorum', 'contractAddress'],
      properties: {
        quorum: {
          type: 'integer',
          title: 'Quorum',
          examples: ['1']
        },
        contractAddress: {
          type: 'string',
          format: 'address',
          title: 'Avatar address',
          examples: ['0x0000…']
        }
      }
    }
  },
  {
    address: '',
    type: 'SimpleQuorumTimelock',
    name: 'Timelock',
    about:
      'Timelock implementation with a specified delay that queues proposal transactions for execution and includes an optional role to veto queued proposals.',
    icon: IHClock,
    generateSummary: (params: Record<string, any>) => `(${params.quorum}, ${params.timelockDelay})`,
    deploy: async (
      client: clients.EvmEthereumTx,
      signer: Signer,
      controller: string,
      spaceAddress: string,
      params: Record<string, any>
    ): Promise<{ address: string; txId: string }> => {
      return client.deployTimelockExecution({
        signer,
        params: {
          controller,
          vetoGuardian: params.vetoGuardian || '0x0000000000000000000000000000000000000000',
          spaces: [spaceAddress],
          timelockDelay: BigInt(params.timelockDelay),
          quorum: BigInt(params.quorum)
        }
      });
    },
    paramsDefinition: {
      type: 'object',
      title: 'Params',
      additionalProperties: false,
      required: ['quorum', 'timelockDelay'],
      properties: {
        quorum: {
          type: 'integer',
          title: 'Quorum',
          examples: ['1']
        },
        vetoGuardian: {
          type: 'string',
          format: 'address',
          title: 'Veto guardian address',
          examples: ['0x0000…']
        },
        timelockDelay: {
          type: 'integer',
          format: 'duration',
          title: 'Timelock delay'
        }
      }
    }
  }
];
