import {
  ChainId,
  DelegationType,
  NetworkID,
  SpacePrivacy,
  VoteType,
  VoteTypeInfo
} from '@/types';

export const APP_NAME = 'Snapshot';

export const SIDEKICK_URL = 'https://sh5.co';

export const UNIFIED_API_URL =
  import.meta.env.VITE_UNIFIED_API_URL ?? 'https://api.snapshot.box';
export const UNIFIED_API_TESTNET_URL =
  import.meta.env.VITE_UNIFIED_API_TESTNET_URL ??
  'https://testnet-api.snapshot.box';

export const HELPDESK_URL = 'https://help.snapshot.box';

export const VERIFIED_URL =
  'https://help.snapshot.box/en/articles/9171639-how-to-get-my-space-verified';

export const EVM_EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000';
export const STARKNET_EMPTY_ADDRESS =
  '0x0000000000000000000000000000000000000000000000000000000000000000';
export const ETH_CONTRACT = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
export const EIP7702_DELEGATION_INDICATOR = '0xef0100';

export const CHAIN_IDS: Record<Exclude<NetworkID, 's' | 's-tn'>, ChainId> = {
  // EVM
  eth: 1,
  oeth: 10,
  matic: 137,
  base: 8453,
  arb1: 42161,
  mnt: 5000,
  ape: 33139,
  curtis: 33111,
  sep: 11155111,
  // Starknet
  sn: '0x534e5f4d41494e',
  'sn-sep': '0x534e5f5345504f4c4941'
};

export const COINGECKO_ASSET_PLATFORMS = {
  1: 'ethereum',
  10: 'optimistic-ethereum',
  100: 'xdai',
  137: 'polygon-pos',
  5000: 'mantle',
  8453: 'base',
  42161: 'arbitrum-one',
  33139: 'apechain',
  33111: 'apechain'
};

export const COINGECKO_BASE_ASSETS = {
  1: 'ethereum',
  10: 'ethereum',
  100: 'xdai',
  137: 'matic-network',
  5000: 'mantle',
  8453: 'ethereum',
  42161: 'ethereum',
  33139: 'apecoin',
  33111: 'apecoin'
};

type ApeGasConfig = {
  l1ChainId: number;
  herodotusContract: string;
  herodotusSatelliteContract: string;
  registryContract: string;
};

export const APE_GAS_CONFIGS: Record<number, ApeGasConfig> = {
  33139: {
    l1ChainId: 1,
    herodotusContract: '0x182696cc5ec88C3E0Cad05E5221B75Ac7f5C4BaF',
    herodotusSatelliteContract: '0x82F29Af756036132Ec188FFbB48447895a8D339e',
    registryContract: '0x2f9e24e272d343c1f833ee7f3c6d6abc689b0102'
  },
  33111: {
    l1ChainId: 11155111,
    herodotusContract: '0xfda8190B613497c47695F54a512a092F1216fA47',
    herodotusSatelliteContract: '0xc9854fd6034fbc41B65b454919a48a5a9b342fa8',
    registryContract: '0xdd6b74123b2ab93ad701320d3f8d1b92b4fa5202'
  }
};

export const MAX_SYMBOL_LENGTH = 12;
export const MAX_FILE_SIZE_BYTES = 1024 * 1024; // 1 MB should be same as https://github.com/snapshot-labs/pineapple/blob/4023c623585e4cde2296922572d35c85d45cf940/src/upload.ts#L10

export const SPACE_CATEGORIES = [
  { id: 'protocol', name: 'Protocol' },
  { id: 'social', name: 'Social' },
  { id: 'investment', name: 'Investment' },
  { id: 'grant', name: 'Grant' },
  { id: 'service', name: 'Service' },
  { id: 'media', name: 'Media' },
  { id: 'creator', name: 'Creator' },
  { id: 'collector', name: 'Collector' },
  { id: 'ai-agent', name: 'AI agent' },
  { id: 'gaming', name: 'Gaming' },
  { id: 'wallet', name: 'Wallet' },
  { id: 'music', name: 'Music' },
  { id: 'layer-2', name: 'Layer 2' },
  { id: 'defai', name: 'DeFAI' },
  { id: 'defi', name: 'DeFi' },
  { id: 'rwa', name: 'RWA' },
  { id: 'depin', name: 'DePIN' },
  { id: 'meme', name: 'Meme' }
] as const;

export const BASIC_CHOICES = ['For', 'Against', 'Abstain'];
export const SUPPORTED_VOTING_TYPES: VoteType[] = [
  'basic',
  'single-choice',
  'approval',
  'ranked-choice',
  'copeland',
  'weighted',
  'quadratic'
] as const;
export const VOTING_TYPES_INFO: Record<
  Exclude<VoteType, 'custom'> | 'any',
  VoteTypeInfo
> = {
  any: {
    label: 'Any',
    description: 'Any type of voting.'
  },
  basic: {
    label: 'Basic voting',
    description:
      'Voters have three choices: they can vote "For", "Against" or "Abstain".'
  },
  'single-choice': {
    label: 'Single choice voting',
    description: 'Voters can select only one choice from a predefined list.'
  },
  approval: {
    label: 'Approval voting',
    description:
      'Voters can select multiple choices, each choice receiving full voting power.'
  },
  'ranked-choice': {
    label: 'Ranked choice voting',
    description:
      'Each voter may select and rank any number of choices. Results are calculated by instant-runoff counting method.'
  },
  weighted: {
    label: 'Weighted voting',
    description:
      'Each voter may spread voting power across any number of choices.'
  },
  quadratic: {
    label: 'Quadratic voting',
    description:
      'Each voter may spread voting power across any number of choices. Results are calculated quadratically.'
  },
  copeland: {
    label: 'Copeland voting',
    description:
      'Voters can rank multiple choices. Results are calculated by Copeland method.',
    isBeta: true
  }
};

export const PRIVACY_TYPES_INFO: Record<
  SpacePrivacy,
  { label: string; description?: string }
> = {
  none: {
    label: 'No privacy'
  },
  shutter: {
    label: 'Shielded voting',
    description:
      'Choices are encrypted and only visible once the voting period is over.'
  },
  any: {
    label: 'Any',
    description: 'Author can choose between no privacy and shielded voting.'
  }
};

export const VALIDATION_TYPES_INFO: Record<
  | 'any-voting'
  | 'only-members'
  | 'basic'
  | 'passport-gated'
  | 'karma-eas-attestation',
  { label: string; description: string }
> = {
  'any-voting': {
    label: 'Anyone can vote',
    description: 'Anyone with voting power can cast a vote.'
  },
  'only-members': {
    label: 'Only authors can propose',
    description: 'Allow only authors to submit a proposal'
  },
  basic: {
    label: 'Basic',
    description:
      'Use a minimum score along with any strategy to determine if a user can create a proposal.'
  },
  'passport-gated': {
    label: 'Gitcoin Passport gated',
    description:
      'Protect your space from spam by requiring users to have a Gitcoin Passport to create a proposal.'
  },
  'karma-eas-attestation': {
    label: 'Karma EAS Attestation',
    description: 'Use EAS attest.sh to determine if user can create a proposal.'
  }
};

export const LAST_USED_CONNECTOR_CACHE_KEY = 'connector';

export const RECENT_CONNECTOR = 'recent-connector';

export const FLAGS = {
  MALICIOUS: 1,
  DMCA: 2
};

export const OVERRIDING_STRATEGIES = [
  'aura-vlaura-vebal-with-overrides',
  'balance-of-with-linear-vesting-power',
  'balancer-delegation',
  'cyberkongz',
  'cyberkongz-v2',
  'delegation',
  'delegation-with-cap',
  'delegation-with-overrides',
  'erc20-balance-of-delegation',
  'erc20-balance-of-fixed-total',
  'erc20-balance-of-quadratic-delegation',
  'erc20-votes-with-override',
  'esd-delegation',
  'ocean-dao-brightid',
  'orbs-network-delegation',
  'api-v2-override',
  'rocketpool-node-operator-delegate-v8',
  'eden-online-override',
  'split-delegation',
  'sonic-staked-balance'
] as const;
export const DISABLED_STRATEGIES: readonly string[] = ['multichain'];
export const DEPRECATED_STRATEGIES = [] as const;
export const DELEGATE_REGISTRY_STRATEGIES = [
  'delegation',
  'erc20-balance-of-delegation',
  'delegation-with-cap',
  'delegation-with-overrides',
  'with-delegation',
  'erc20-balance-of-with-delegation',
  'spark-with-delegation'
];

export const DELEGATION_TYPES_NAMES: Record<DelegationType, string> = {
  'delegate-registry': 'Delegate registry',
  'apechain-delegate-registry': 'ApeChain Delegate Registry',
  'split-delegation': 'Split Delegation',
  'governor-subgraph': 'ERC-20 Votes'
};

export const SPACE_COVER_DIMENSIONS = {
  sm: { width: 450, height: 120 },
  lg: { width: 1500, height: 400 }
};
