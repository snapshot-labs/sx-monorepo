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

export const API_URL = 'https://api.thegraph.com/subgraphs/name/snapshot-labs/sx-goerli';

export const SUPPORTED_AUTHENTICATORS = {
  '0xddb36b865a1021524b936fb29fcba5fac073db74': true,
  '0xc537d997ddc783e071f82ccbfaa0d768d310001b': true
};

export const SUPPORTED_STRATEGIES = {
  '0xeba53160c146cbf77a150e9a218d4c2de5db6b51': true,
  '0x343baf4b44f7f79b14301cfa8068e3f8be7470de': true,
  '0x4aaa33b4367dc5657854bd40738201651ec0cc7b': true,
  '0xf50bf15e9fe61e27625a4ecdfc23211297e8be85': true
};

export const SUPPORTED_EXECUTORS = {
  SimpleQuorumAvatar: true,
  SimpleQuorumTimelock: true
};

export const RELAYER_AUTHENTICATORS = {
  '0xc537d997ddc783e071f82ccbfaa0d768d310001b': true
};

export const AUTHS = {
  '0xdd66652e93293c32aa3288509d9a46c785e3f786': 'Vanilla',
  '0xc537d997ddc783e071f82ccbfaa0d768d310001b': 'Ethereum signature',
  '0xddb36b865a1021524b936fb29fcba5fac073db74': 'Ethereum transaction'
};

export const PROPOSAL_VALIDATIONS = {
  '0x80d9665e5761a778a97283dec14581c4c0bf8d51': 'Vanilla',
  '0x03d512e0165d6b53ed2753df2f3184fbd2b52e48': 'Voting power'
};

export const STRATEGIES = {
  '0xeba53160c146cbf77a150e9a218d4c2de5db6b51': 'Vanilla',
  '0x343baf4b44f7f79b14301cfa8068e3f8be7470de': 'Delegated Comp Token',
  '0x4aaa33b4367dc5657854bd40738201651ec0cc7b': 'Oz Votes',
  '0xf50bf15e9fe61e27625a4ecdfc23211297e8be85': 'Whitelist'
};

export const EXECUTORS = {
  SimpleQuorumAvatar: 'Avatar',
  SimpleQuorumTimelock: 'Timelock'
};

export const EDITOR_AUTHENTICATORS = [
  {
    address: '0xddb36b865a1021524b936fb29fcba5fac073db74',
    name: 'Ethereum transaction',
    about:
      'Will authenticate a user by checking if the caller address corresponds to the author or voter address.',
    icon: IHCube,
    paramsDefinition: null
  },
  {
    address: '0xc537d997ddc783e071f82ccbfaa0d768d310001b',
    name: 'Ethereum signature',
    about:
      'Will authenticate a user based on an EIP-712 message signed by an Ethereum private key.',
    icon: IHPencil,
    paramsDefinition: null
  }
];

export const EDITOR_PROPOSAL_VALIDATIONS = [
  {
    address: '0x80d9665e5761a778a97283dec14581c4c0bf8d51',
    name: 'Vanilla',
    paramsDefinition: null
  },
  {
    address: '0x03d512E0165d6B53ED2753Df2f3184fBd2b52E48',
    type: 'VotingPower',
    name: 'Voting power',
    validate: (params: Record<string, any>) => {
      return params?.strategies?.length > 0;
    },
    generateSummary: (params: Record<string, any>) => `(${params.threshold})`,
    generateParams: (params: Record<string, any>) => {
      const abiCoder = new AbiCoder();

      const strategies = params.strategies.map((strategy: StrategyConfig) => {
        return {
          addy: strategy.address,
          params: strategy.generateParams ? strategy.generateParams(strategy.params)[0] : '0x00'
        };
      });

      return [
        abiCoder.encode(
          ['uint256', 'tuple(address addy, bytes params)[]'],
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
          type: 'string',
          title: 'Proposal threshold',
          examples: ['1']
        }
      }
    }
  }
];

export const EDITOR_VOTING_STRATEGIES = [
  {
    address: '0xeba53160c146cbf77a150e9a218d4c2de5db6b51',
    name: 'Vanilla',
    about:
      'A strategy that gives one voting power to anyone. It should only be used for testing purposes and not in production.',
    icon: IHBeaker,
    generateMetadata: (params: Record<string, any>) => ({
      name: 'Vanilla',
      properties: {
        symbol: params.symbol,
        decimals: 1
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
    address: '0x343baf4b44f7f79b14301cfa8068e3f8be7470de',
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
    address: '0x4aaa33b4367dc5657854bd40738201651ec0cc7b',
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
          type: 'string',
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
          type: 'string',
          title: 'Quorum',
          examples: ['1']
        },
        timelockDelay: {
          type: 'string',
          title: 'Timelock delay',
          examples: ['1']
        }
      }
    }
  }
];
