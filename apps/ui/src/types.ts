export type Space = {
  id: string;
  name: string;
  about?: string;
  controller: string;
  voting_delay: number;
  min_voting_period: number;
  max_voting_period: number;
  proposal_threshold: number;
  quorum: number;
  proposal_count: number;
  vote_count: number;
  created: number;
};

export type Proposal = {
  title: string;
  body: string;
  discussion: string;
  execution: Transaction[];
  updatedAt: number;
};

export type Proposals = Record<string, Proposal>;

export type BaseTransaction = {
  to: string;
  data: string;
  value: string;
};

export type TransactionData = BaseTransaction & {
  nonce: number;
  operation: '0';
};

export type SendTokenTransaction = BaseTransaction & {
  _type: 'sendToken';
  _form: {
    recipient: string;
    amount: string;
    token: {
      name: string;
      decimals: number;
      symbol: string;
      address: string;
    };
  };
};

export type SendNftTransaction = BaseTransaction & {
  _type: 'sendNft';
  _form: {
    recipient: string;
    amount: string;
    nft: {
      address: string;
      id: string;
      name: string;
      collection?: string;
    };
  };
};

export type ContractCallTransaction = BaseTransaction & {
  _type: 'contractCall';
  _form: {
    abi: any[];
    recipient: string;
    method: string;
    args: any;
    amount?: string;
  };
};

export type Transaction =
  | SendTokenTransaction
  | SendNftTransaction
  | ContractCallTransaction;
