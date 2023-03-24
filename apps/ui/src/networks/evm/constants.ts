import { AbiCoder } from '@ethersproject/abi';
import { clients } from '@snapshot-labs/sx';
import { shorten } from '@/helpers/utils';
import type { Signer } from '@ethersproject/abstract-signer';
import type { StrategyConfig } from '../types';

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
  SimpleQuorumAvatar: true
};

export const RELAYER_AUTHENTICATORS = {
  '0xc537d997ddc783e071f82ccbfaa0d768d310001b': true
};

export const AUTHS = {
  '0xdd66652e93293c32aa3288509d9a46c785e3f786': 'Vanilla',
  '0xc537d997ddc783e071f82ccbfaa0d768d310001b': 'Ethereum signature',
  '0xddb36b865a1021524b936fb29fcba5fac073db74': 'Ethereum transaction'
};

export const STRATEGIES = {
  '0xeba53160c146cbf77a150e9a218d4c2de5db6b51': 'Vanilla',
  '0x343baf4b44f7f79b14301cfa8068e3f8be7470de': 'Delegated Comp Token',
  '0x4aaa33b4367dc5657854bd40738201651ec0cc7b': 'Oz Votes',
  '0xf50bf15e9fe61e27625a4ecdfc23211297e8be85': 'Whitelist'
};

export const EXECUTORS = {};

export const EDITOR_AUTHENTICATORS = [
  {
    address: '0xddb36b865a1021524b936fb29fcba5fac073db74',
    name: 'Ethereum transaction',
    paramsDefinition: null
  },
  {
    address: '0xc537d997ddc783e071f82ccbfaa0d768d310001b',
    name: 'Ethereum signature',
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
    name: 'Voting Power',
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
    paramsDefinition: null
  },
  {
    address: '0x343baf4b44f7f79b14301cfa8068e3f8be7470de',
    name: 'Delegated Comp Token',
    generateSummary: (params: Record<string, any>) =>
      `(${shorten(params.contractAddress)}, ${params.decimals})`,
    generateParams: (params: Record<string, any>) => [params.contractAddress],
    generateMetadata: (params: Record<string, any>) => `0x${params.decimals.toString(16)}`,
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
        }
      }
    }
  },
  {
    address: '0x4aaa33b4367dc5657854bd40738201651ec0cc7b',
    name: 'Oz Votes',
    generateSummary: (params: Record<string, any>) =>
      `(${shorten(params.contractAddress)}, ${params.decimals})`,
    generateParams: (params: Record<string, any>) => [params.contractAddress],
    generateMetadata: (params: Record<string, any>) => `0x${params.decimals.toString(16)}`,
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
        }
      }
    }
  }
];

export const EDITOR_EXECUTION_STRATEGIES = [
  {
    address: '',
    type: 'SimpleQuorumAvatar',
    name: 'Avatar',
    generateSummary: (params: Record<string, any>) =>
      `(${params.quorum}, ${shorten(params.contractAddress)})`,
    generateParams: (params: Record<string, any>) => [
      `0x${params.quorum.toString(16).padStart(64, '0')}`
    ],
    deploy: async (
      client: clients.EvmEthereumTx,
      signer: Signer,
      controller: string,
      spaceAddress: string,
      params: Record<string, any>
    ): Promise<string> => {
      const { address } = await client.deployAvatarExecution({
        signer,
        params: {
          controller,
          target: params.contractAddress,
          spaces: [spaceAddress],
          quorum: BigInt(params.quorum)
        }
      });

      return address;
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
  }
];
