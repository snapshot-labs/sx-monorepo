import { BigNumberish, Call, RpcProvider } from 'starknet';
import { SignatureData as BaseSignatureData, Choice } from '../../types';
import { NetworkConfig } from '../../types/networkConfig';

export type SignatureData = BaseSignatureData;

export type ProposeCallArgs = {
  author: string;
  executionStrategy: {
    address: string;
    params: string[];
  };
  // rename to user_proposal_validation_params
  strategiesParams: string[];
  metadataUri: string;
};

export type VoteCallArgs = {
  voter: string;
  proposalId: number;
  choice: Choice;
  votingStrategies: IndexedConfig[];
  metadataUri: string;
};

export type UpdateProposalCallArgs = {
  author: string;
  proposalId: number;
  executionStrategy: {
    address: string;
    params: string[];
  };
  metadataUri: string;
};

export type Authenticator = {
  type: string;
  createProposeCall(envelope: Envelope<Propose>, args: ProposeCallArgs): Call;
  createVoteCall(envelope: Envelope<Vote>, args: VoteCallArgs): Call;
  createUpdateProposalCall(
    envelope: Envelope<UpdateProposal>,
    args: UpdateProposalCallArgs
  ): Call;
};

export interface Strategy {
  type: string;
  getParams(
    call: 'propose' | 'vote',
    signerAddress: string,
    address: string,
    index: number,
    params: string,
    metadata: Record<string, any> | null,
    envelope: Envelope<Message>,
    clientConfig: ClientConfig
  ): Promise<string[]>;
  getVotingPower: (
    strategyAddress: string,
    voterAddress: string,
    metadata: Record<string, any> | null,
    timestamp: number | null,
    params: string[],
    clientConfig: ClientConfig
  ) => Promise<bigint>;
}

export type ClientOpts = {
  ethUrl: string;
  starkProvider: RpcProvider;
  networkConfig: NetworkConfig;
  whitelistServerUrl: string;
};

export type ClientConfig = {
  ethUrl: string;
  starkProvider: RpcProvider;
  networkConfig: NetworkConfig;
  whitelistServerUrl: string;
};

// TODO: normalize with EVM
export type AddressConfig = {
  addr: string;
  params: string[];
};

export type IndexedConfig = {
  index: number;
  params: string[];
};

export type StrategyConfig = {
  index: number;
  address: string;
  params: string;
  metadata?: Record<string, any>;
};

export type StrategiesAddresses = { index: number; address: string }[];

export type Propose = {
  space: string;
  authenticator: string;
  strategies: StrategyConfig[];
  executionStrategy: AddressConfig;
  metadataUri: string;
};

export type UpdateProposal = {
  space: string;
  proposal: number;
  authenticator: string;
  executionStrategy: AddressConfig;
  metadataUri: string;
};

export type Vote = {
  space: string;
  authenticator: string;
  strategies: StrategyConfig[];
  proposal: number;
  choice: Choice;
  metadataUri: string;
};

export type Alias = {
  alias: string;
};

export type Message = Propose | Vote | UpdateProposal | Alias;

export type Envelope<T extends Message> = {
  signatureData?: SignatureData;
  data: T;
};

export type StarknetEIP712ProposeMessage = {
  space: string;
  author: string;
  executionStrategy: {
    address: string;
    params: string[];
  };
  userProposalValidationParams: string[];
  metadataUri: string[];
  salt: string;
};

export type StarknetEIP712UpdateProposalMessage = {
  space: string;
  author: string;
  proposalId: { low: BigNumberish; high: BigNumberish };
  executionStrategy: {
    address: string;
    params: string[];
  };
  metadataUri: string[];
  salt: string;
};

export type StarknetEIP712VoteMessage = {
  space: string;
  voter: string;
  proposalId: { low: BigNumberish; high: BigNumberish };
  choice: string;
  userVotingStrategies: { index: number; params: string[] }[];
  metadataUri: string[];
};

export type StarknetEIP712AliasMessage = {
  alias: string;
  from?: string;
  timestamp?: number;
};

export type EIP712ProposeMessage = StarknetEIP712ProposeMessage & {
  authenticator: string;
};

export type EIP712UpdateProposalMessage = Omit<
  StarknetEIP712UpdateProposalMessage,
  'proposalId'
> & {
  authenticator: string;
  proposalId: string;
};

export type EIP712VoteMessage = Omit<
  StarknetEIP712VoteMessage,
  'proposalId'
> & {
  authenticator: string;
  proposalId: string;
};
