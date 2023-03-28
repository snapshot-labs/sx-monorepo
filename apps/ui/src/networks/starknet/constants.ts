import { shorten } from '@/helpers/utils';

export const API_URL = 'https://api-1.snapshotx.xyz';

export const SUPPORTED_AUTHENTICATORS = {
  '0x64cce9272197eba6353f5bbf060e097e516b411e66e83a9cf5910a08697df14': true
};

export const SUPPORTED_STRATEGIES = {
  '0x58623786b93d9b6ed1f83cec5c6fa6bea5f399d2795ee56a6123bdd83f5aa48': true,
  '0xd1b81feff3095ca9517fdfc7427e742ce96f7ca8f3b2664a21b2fba552493b': true
};

export const SUPPORTED_EXECUTORS = {
  '0x21dda40770f4317582251cffd5a0202d6b223dc167e5c8db25dc887d11eba81': true
};

export const AUTHS = {
  '0x5e1f273ca9a11f78bfb291cbe1b49294cf3c76dd48951e7ab7db6d9fb1e7d62': 'Vanilla',
  '0x64cce9272197eba6353f5bbf060e097e516b411e66e83a9cf5910a08697df14': 'Ethereum signature',
  '0x4112e7aef90c47058238ccb76bf79ad5188afdf366870015185e3c7468ccbd9':
    'Ethereum signature session key',
  '0x68a2d3c6d882ec0e2e94042556878d27e832a28e1308df04ad35fd8bae9ec6b': 'Ethereum transaction',
  '0x64bb9fd620d7e4c5f5895329e8f1d3d5f485ccfb2b16345a1ca86658f24c9f6':
    'Ethereum transaction session key',
  '0x59283b509832027a386b3f419628a5b149e9d6462a6547c63e92bd4a09a7245': 'Starknet signature'
};

export const PROPOSAL_VALIDATIONS = {};

export const STRATEGIES = {
  '0x58623786b93d9b6ed1f83cec5c6fa6bea5f399d2795ee56a6123bdd83f5aa48': 'Vanilla',
  '0xd1b81feff3095ca9517fdfc7427e742ce96f7ca8f3b2664a21b2fba552493b': 'Single slot proof'
};

export const EXECUTORS = {
  '0x4ecc83848a519cc22b0d0ffb70e65ec8dde85d3d13439eff7145d4063cf6b4d': 'Vanilla',
  '0x21dda40770f4317582251cffd5a0202d6b223dc167e5c8db25dc887d11eba81': 'Zodiac'
};

export const EDITOR_AUTHENTICATORS = [
  {
    address: '0x5e1f273ca9a11f78bfb291cbe1b49294cf3c76dd48951e7ab7db6d9fb1e7d62',
    name: 'Vanilla',
    paramsDefinition: null
  },
  {
    address: '0x64cce9272197eba6353f5bbf060e097e516b411e66e83a9cf5910a08697df14',
    name: 'Ethereum signature',
    paramsDefinition: null
  }
];

export const EDITOR_PROPOSAL_VALIDATIONS = [];

export const EDITOR_VOTING_STRATEGIES = [
  {
    address: '0x58623786b93d9b6ed1f83cec5c6fa6bea5f399d2795ee56a6123bdd83f5aa48',
    name: 'Vanilla',
    paramsDefinition: null
  },
  {
    address: '0xd1b81feff3095ca9517fdfc7427e742ce96f7ca8f3b2664a21b2fba552493b',
    name: 'Single slot proof',
    generateSummary: (params: Record<string, any>) =>
      `(${shorten(params.contractAddress)}, ${params.slotIndex})`,
    generateParams: (params: Record<string, any>) => [
      params.contractAddress,
      `0x${params.slotIndex.toString(16)}`
    ],
    paramsDefinition: {
      type: 'object',
      title: 'Params',
      additionalProperties: false,
      required: ['contractAddress', 'slotIndex'],
      properties: {
        contractAddress: {
          type: 'string',
          format: 'address',
          title: 'Contract address',
          examples: ['0x0000…']
        },
        slotIndex: {
          type: 'string',
          title: 'Storage slot',
          examples: ['e.g. 1']
        }
      }
    }
  }
];

export const EDITOR_EXECUTION_STRATEGIES = [
  {
    address: '0x4ecc83848a519cc22b0d0ffb70e65ec8dde85d3d13439eff7145d4063cf6b4d',
    name: 'Vanilla',
    paramsDefinition: null
  },
  {
    address: '0x21dda40770f4317582251cffd5a0202d6b223dc167e5c8db25dc887d11eba81',
    name: 'Zodiac',
    paramsDefinition: null
  }
];
