import {
  ChainId,
  NetworkID,
  SpacePrivacy,
  VoteType,
  VoteTypeInfo
} from '@/types';

export const APP_NAME = 'Snapshot';

export const SIDEKICK_URL = 'https://sh5.co';

export const UNIFIED_API_URL = 'https://api.snapshot.box';
export const UNIFIED_API_TESTNET_URL = 'https://testnet-api.snapshot.box';

export const HELPDESK_URL = 'https://help.snapshot.box';

export const TURBO_URL =
  'https://docs.snapshot.box/user-guides/spaces/turbo-plan';

export const VERIFIED_URL =
  'https://help.snapshot.box/en/articles/9171639-how-to-get-my-space-verified';

export const ETH_CONTRACT = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

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
  137: 'polygon-pos',
  8453: 'base',
  42161: 'arbitrum-one',
  33139: 'ethereum',
  33111: 'apechain'
};

export const COINGECKO_BASE_ASSETS = {
  1: 'ethereum',
  10: 'ethereum',
  137: 'matic-network',
  8453: 'ethereum',
  42161: 'ethereum',
  33139: 'ethereum',
  33111: 'apecoin'
};

export const MAX_SYMBOL_LENGTH = 12;

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
