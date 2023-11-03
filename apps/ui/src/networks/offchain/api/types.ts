export type ApiSpace = {
  id: string;
  admins: string[];
  name: string;
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
  proposalsCount: number;
  votesCount: number;
};

export type ApiProposal = {
  id: string;
  ipfs: string;
  space: {
    id: string;
    name: string;
    admins: string[];
    symbol: string;
  };
  type: 'basic' | 'single-choice' | string;
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
  state: string;
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
