import type { TypedDataDomain, TypedDataField } from '@ethersproject/abstract-signer';
import type { Privacy } from '../../types';

export type Choice = number | number[] | string | Record<string, number>;

export type SignatureData = {
  address: string;
  signature: string;
  domain: TypedDataDomain;
  types: Record<string, TypedDataField[]>;
  message: Record<string, any>;
};

export type Envelope<T extends Vote | Propose | UpdateProposal | CancelProposal> = {
  signatureData?: SignatureData;
  data: T;
};

export type StrategyConfig = {
  index: number;
  address: string;
  metadata?: Record<string, any>;
};

export type SnapshotInfo = {
  at: number | null;
  chainId?: number;
};

export type Strategy = {
  type: string;
  getVotingPower(
    spaceId: string,
    voterAddress: string,
    params: any,
    snapshotInfo: SnapshotInfo
  ): Promise<bigint[]>;
};

export type EIP712VoteMessage = {
  space: string;
  proposal: string;
  choice: number | number[] | string;
  reason: string;
  app: string;
  metadata: string;
  privacy?: Privacy;
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

export type EIP712CancelProposalMessage = {
  space: string;
  proposal: string;
  from?: string;
  timestamp?: number;
};

export type EIP712Message = Required<
  EIP712VoteMessage | EIP712ProposeMessage | EIP712UpdateProposal | EIP712CancelProposalMessage
>;

export type Vote = {
  space: string;
  authenticator: string;
  strategies: StrategyConfig[];
  proposal: string;
  choice: Choice;
  metadataUri: string;
  type: string;
  privacy?: Privacy;
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

export type CancelProposal = {
  from?: string;
  space: string;
  timestamp?: number;
  proposal: string;
};
