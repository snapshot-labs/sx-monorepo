import { Privacy, VoteType } from '@/types';

export type ApiSpace = {
  id: string;
  verified: boolean;
  turbo: boolean;
  admins: string[];
  members: string[];
  name: string;
  avatar: string;
  network: string;
  about: string;
  website: string;
  twitter: string;
  github: string;
  coingecko: string;
  symbol: string;
  treasuries: [
    {
      name: string;
      network: string;
      address: string;
    }
  ];
  delegationPortal?: {
    delegationType: string;
    delegationContract: string;
    delegationApi: string;
  };
  voting: {
    delay: number | null;
    period: number | null;
    quorum: number | null;
    type: VoteType | null;
  };
  strategies: { network: string; params: Record<string, any>; name: string }[];
  validation: {
    name: string;
    params?: any;
  };
  filters: {
    minScore: number;
    onlyMembers: boolean;
  };
  proposalsCount: number;
  votesCount: number;
  followersCount: number;
};

export type ApiProposal = {
  id: string;
  ipfs: string;
  space: {
    id: string;
    name: string;
    avatar: string;
    network: string;
    admins: string[];
    moderators: string[];
    symbol: string;
  };
  type: VoteType;
  title: string;
  body: string;
  discussion: string;
  author: string;
  quorum: number;
  quorumType?: 'default' | 'rejection';
  start: number;
  end: number;
  snapshot: number;
  choices: string[];
  scores: number[];
  scores_total: number;
  state: 'active' | 'pending' | 'closed';
  strategies: { network: string; params: Record<string, any>; name: string }[];
  created: number;
  updated: number | null;
  votes: number;
  privacy: Privacy;
  plugins: Record<string, any>;
};

export type ApiVote = {
  id: string;
  voter: string;
  ipfs: string;
  space: {
    id: string;
  };
  proposal: {
    id: string;
  };
  choice: number | number[] | Record<string, number>;
  vp: number;
  reason: string;
  created: number;
};
