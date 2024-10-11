import { Privacy, SignatureData } from '../../types';

export type Choice = number | number[] | string | Record<string, number>;

export type Envelope<
  T extends
    | Vote
    | Propose
    | UpdateProposal
    | CancelProposal
    | FollowSpace
    | UnfollowSpace
    | SetAlias
> = {
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
  labels: string[];
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
  labels: string[];
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

export type EIP712FollowSpaceMessage = {
  network: string;
  space: string;
  from?: string;
  timestamp?: number;
};

export type EIP712UnfollowSpaceMessage = {
  network: string;
  space: string;
  from?: string;
  timestamp?: number;
};

export type EIP712SetAliasMessage = {
  from?: string;
  alias: string;
  timestamp?: number;
};

export type EIP712UpdateUserMessage = {
  from?: string;
  profile: string;
  timestamp?: number;
};

export type EIP712UpdateStatementMessage = {
  from?: string;
  timestamp?: number;
  space: string;
  network: string;
  about: string;
  statement: string;
  discourse: string;
  status: string;
};

export type EIP712UpdateSpaceMessage = {
  from?: string;
  timestamp?: number;
  space: string;
  settings: string;
};

export type EIP712DeleteSpaceMessage = {
  from?: string;
  space: string;
  timestamp?: number;
};

export type EIP712Message = Required<
  | EIP712VoteMessage
  | EIP712ProposeMessage
  | EIP712UpdateProposal
  | EIP712CancelProposalMessage
  | EIP712FollowSpaceMessage
  | EIP712UnfollowSpaceMessage
  | EIP712SetAliasMessage
  | EIP712UpdateUserMessage
  | EIP712UpdateStatementMessage
  | EIP712UpdateSpaceMessage
  | EIP712DeleteSpaceMessage
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
  reason?: string;
};

export type Propose = {
  space: string;
  type: string;
  title: string;
  body: string;
  discussion: string;
  choices: string[];
  labels: string[];
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
  labels: string[];
  plugins: string;
};

export type CancelProposal = {
  from?: string;
  space: string;
  timestamp?: number;
  proposal: string;
};

export type FollowSpace = {
  from?: string;
  network: string;
  space: string;
  timestamp?: number;
};

export type UnfollowSpace = {
  from?: string;
  network: string;
  space: string;
  timestamp?: number;
};

export type SetAlias = {
  from?: string;
  alias: string;
  timestamp?: number;
};

export type UpdateUser = {
  from?: string;
  profile: string;
  timestamp?: number;
};

export type UpdateStatement = {
  from?: string;
  timestamp?: number;
  space: string;
  network: string;
  statement: string;
  discourse: string;
  status: string;
};

export type UpdateSpace = {
  from?: string;
  timestamp?: number;
  space: string;
  settings: string;
};

export type DeleteSpace = {
  from?: string;
  timestamp?: number;
  space: string;
};
