import { VoteType, VoteTypeInfo } from '@/types';

export const APP_NAME = 'Snapshot';

export const SIDEKICK_URL = 'https://sh5.co';

export const ETH_CONTRACT = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

export const CHAIN_IDS = {
  matic: 137,
  arb1: 42161,
  oeth: 10,
  eth: 1,
  sep: 11155111,
  'linea-testnet': 59140,
  bsc: 56,
  xdai: 100,
  fantom: 250,
  base: 8453
};

export const COINGECKO_ASSET_PLATFORMS = {
  1: 'ethereum',
  10: 'optimistic-ethereum',
  137: 'polygon-pos',
  42161: 'arbitrum-one'
};

export const COINGECKO_BASE_ASSETS = {
  1: 'ethereum',
  10: 'ethereum',
  137: 'matic-network',
  42161: 'ethereum'
};

export const MAX_SYMBOL_LENGTH = 12;

export const BASIC_CHOICES = ['For', 'Against', 'Abstain'];
export const SUPPORTED_VOTING_TYPES: VoteType[] = [
  'basic',
  'single-choice',
  'approval',
  'ranked-choice',
  'weighted',
  'quadratic'
] as const;
export const VOTING_TYPES_INFO: Record<
  Exclude<VoteType, 'custom'>,
  VoteTypeInfo
> = {
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
  }
};
