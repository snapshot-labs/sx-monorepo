export type ApiSpace = {
  id: string;
  admins: string[];
  members: string[];
  name: string;
  network: string;
  about: string;
  website: string;
  twitter: string;
  github: string;
  symbol: string;
  treasuries: [
    {
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
};

export type ApiProposal = {
  id: string;
  ipfs: string;
  space: {
    id: string;
    name: string;
    network: string;
    admins: string[];
    symbol: string;
  };
  type:
    | 'basic'
    | 'single-choice'
    | 'approval'
    | 'ranked-choice'
    | 'quadratic'
    | 'weighted'
    | 'custom';
  title: string;
  body: string;
  discussion: string;
  author: string;
  quorum: number;
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
  choice: number | number[];
  vp: number;
  created: number;
};
