import type { TypedDataDomain, TypedDataField } from '@ethersproject/abstract-signer';

enum Choice {
  Against = 2,
  For = 1,
  Abstain = 3
}

export type SignatureData = {
  address: string;
  signature: string;
  domain: TypedDataDomain;
  types: Record<string, TypedDataField[]>;
  message: Record<string, any>;
};

export type Envelope<T extends Vote | Propose> = {
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
};

export type EIP712Message = (EIP712VoteMessage | EIP712ProposeMessage) & {
  timestamp: number;
  from: string;
};

export type Vote = {
  space: string;
  authenticator: string;
  strategies: StrategyConfig[];
  proposal: string;
  choice: Choice;
  metadataUri: string;
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
};
