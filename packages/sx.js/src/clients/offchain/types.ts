import type { TypedDataDomain, TypedDataField } from '@ethersproject/abstract-signer';

type Choice = number | number[];

export type SignatureData = {
  address: string;
  signature: string;
  domain: TypedDataDomain;
  types: Record<string, TypedDataField[]>;
  message: Record<string, any>;
};

export type Envelope<T extends Vote | Propose | UpdateProposal> = {
  signatureData?: SignatureData;
  data: T;
};

export type StrategyConfig = {
  index: number;
  address: string;
  metadata?: Record<string, any>;
};

export type EIP712VoteMessage = {
  space: string;
  proposal: string;
  choice: number | number[] | string | { [key: string]: number };
  reason: string;
  app: string;
  metadata: string;
  timestamp?: number;
  from?: string;
};

export type EIP712ProposeMessage = {
  space: string;
  type: string;
  title: string;
  body: string;
  discussion: string;
  choices: string[];
  start: number;
  end: number;
  snapshot: number;
  plugins: string;
  app: string;
  timestamp?: number;
  from?: string;
};

export type EIP712UpdateProposal = {
  proposal: string;
  space: string;
  type: string;
  title: string;
  body: string;
  discussion: string;
  choices: string[];
  plugins: string;
  timestamp?: number;
  from?: string;
};

export type EIP712Message = Required<
  EIP712VoteMessage | EIP712ProposeMessage | EIP712UpdateProposal
>;

export type Vote = {
  space: string;
  authenticator: string;
  strategies: StrategyConfig[];
  proposal: string;
  choice: Choice;
  metadataUri: string;
  type: string;
  timestamp?: number;
};

export type Propose = {
  space: string;
  type: string;
  title: string;
  body: string;
  discussion: string;
  choices: string[];
  start: number;
  end: number;
  snapshot: number;
  plugins: string;
  app: string;
  timestamp?: number;
};

export type UpdateProposal = {
  proposal: string;
  space: string;
  type: string;
  title: string;
  body: string;
  discussion: string;
  choices: string[];
  plugins: string;
};
