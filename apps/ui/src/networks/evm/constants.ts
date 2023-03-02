import { shorten } from '@/helpers/utils';

export const API_URL = 'https://api.thegraph.com/subgraphs/name/snapshot-labs/sx-goerli';

export const SUPPORTED_AUTHENTICATORS = {
  '0x86bfa0726cba0febeee457f04b705ab74b54d01c': true,
  '0x37315ce75920b653f0f13734c709e199876455c9': true
};

export const SUPPORTED_STRATEGIES = {
  '0x395ed61716b48dc904140b515e9f682e33330154': true,
  '0xbbd17346378f76c1c94032594b57c93c24857b19': true
};

export const SUPPORTED_EXECUTORS = {
  '0xb1001fdf62c020761039a750b27e73c512fdaa5e': true
};

export const AUTHS = {
  '0x86bfa0726cba0febeee457f04b705ab74b54d01c': 'Vanilla',
  '0x486039513b72967cd81272f204d4eaff68d0dfd0': 'Ethereum signature',
  '0x37315ce75920b653f0f13734c709e199876455c9': 'Ethereum transaction'
};

export const STRATEGIES = {
  '0x395ed61716b48dc904140b515e9f682e33330154': 'Vanilla',
  '0xbbd17346378f76c1c94032594b57c93c24857b19': 'Delegated Comp Token'
};

export const EXECUTORS = {
  '0xb1001fdf62c020761039a750b27e73c512fdaa5e': 'Vanilla'
};

export const EDITOR_AUTHENTICATORS = [
  {
    address: '0x86bfa0726cba0febeee457f04b705ab74b54d01c',
    name: 'Vanilla',
    paramsDefinition: null
  },
  {
    address: '0x37315ce75920b653f0f13734c709e199876455c9',
    name: 'Ethereum transaction',
    paramsDefinition: null
  }
];

export const EDITOR_VOTING_STRATEGIES = [
  {
    address: '0x395ed61716b48dc904140b515e9f682e33330154',
    name: 'Vanilla',
    paramsDefinition: null
  },
  {
    address: '0xbbd17346378f76c1c94032594b57c93c24857b19',
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
    address: '0xb1001fdf62c020761039a750b27e73c512fdaa5e',
    name: 'Vanilla',
    paramsDefinition: null
  }
];
