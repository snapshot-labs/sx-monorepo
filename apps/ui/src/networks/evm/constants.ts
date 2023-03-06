import { shorten } from '@/helpers/utils';
import type { Signer } from '@ethersproject/abstract-signer';

export const API_URL = 'https://api.thegraph.com/subgraphs/name/snapshot-labs/sx-goerli';

export const SUPPORTED_AUTHENTICATORS = {
  '0xcc3fb327de5428d182ba2e739aea5978c0e2ce35': true,
  '0x277f388b77cd36fff1c0e976c49a7c54413a449a': true
};

export const SUPPORTED_STRATEGIES = {
  '0xf3e55d22845689be3e062975444d09799e522a6c': true,
  '0x0bed117707f698fccb68223de297bf3e3df7082c': true,
  '0x95287283ed7c583120b06ff48a655062976ac41c': true
};

export const SUPPORTED_EXECUTORS = {
  '0x6241b5c89350bb3c465179706cf26050ea32444f': true
};

export const AUTHS = {
  '0xdd66652e93293c32aa3288509d9a46c785e3f786': 'Vanilla',
  '0x277f388b77cd36fff1c0e976c49a7c54413a449a': 'Ethereum signature',
  '0xcc3fb327de5428d182ba2e739aea5978c0e2ce35': 'Ethereum transaction'
};

export const STRATEGIES = {
  '0xf3e55d22845689be3e062975444d09799e522a6c': 'Vanilla',
  '0x0bed117707f698fccb68223de297bf3e3df7082c': 'Delegated Comp Token',
  '0x95287283ed7c583120b06ff48a655062976ac41c': 'Whitelist'
};

export const EXECUTORS = {
  '0x6241b5c89350bb3c465179706cf26050ea32444f': 'Vanilla'
};

export const EDITOR_AUTHENTICATORS = [
  {
    address: '0xcc3fb327de5428d182ba2e739aea5978c0e2ce35',
    name: 'Ethereum transaction',
    paramsDefinition: null
  },
  {
    address: '0x277f388b77cd36fff1c0e976c49a7c54413a449a',
    name: 'Ethereum signature',
    paramsDefinition: null
  }
];

export const EDITOR_VOTING_STRATEGIES = [
  {
    address: '0xf3e55d22845689be3e062975444d09799e522a6c',
    name: 'Vanilla',
    paramsDefinition: null
  },
  {
    address: '0x0bed117707f698fccb68223de297bf3e3df7082c',
    name: 'Delegated Comp Token',
    generateSummary: (params: Record<string, any>) => `(${shorten(params.contractAddress)})`,
    generateParams: (params: Record<string, any>) => [params.contractAddress],
    paramsDefinition: {
      type: 'object',
      title: 'Params',
      additionalProperties: false,
      required: ['contractAddress'],
      properties: {
        contractAddress: {
          type: 'string',
          format: 'address',
          title: 'Contract address',
          examples: ['0x0000…']
        }
      }
    }
  }
];

export const EDITOR_EXECUTION_STRATEGIES = [
  {
    address: '0x6241b5c89350bb3c465179706cf26050ea32444f',
    name: 'Vanilla',
    generateSummary: (params: Record<string, any>) => `(${params.quorum})`,
    generateParams: (params: Record<string, any>) => [
      `0x${params.quorum.toString(16).padStart(64, '0')}`
    ],
    paramsDefinition: {
      type: 'object',
      title: 'Params',
      additionalProperties: false,
      required: ['quorum'],
      properties: {
        quorum: {
          type: 'string',
          title: 'Quorum',
          examples: ['1']
        }
      }
    }
  },
  {
    address: '0x87f527c699ce6c7cb65718d5c7d468597d952cab',
    type: 'SimpleQuorumAvatar',
    name: 'Avatar',
    generateSummary: (params: Record<string, any>) =>
      `(${params.quorum}, ${shorten(params.contractAddress)})`,
    generateParams: (params: Record<string, any>) => [
      `0x${params.quorum.toString(16).padStart(64, '0')}`
    ],
    deploy: async (client: any, signer: Signer, controller, params: Record<string, any>) => {
      return client.deployAvatarExecution({
        signer,
        controller,
        target: params.contractAddress,
        spaces: []
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
  }
];
