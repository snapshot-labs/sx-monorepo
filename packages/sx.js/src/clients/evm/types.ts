import {
  TypedDataDomain,
  TypedDataField
} from '@ethersproject/abstract-signer';
import { ContractInterface } from '@ethersproject/contracts';
import { Provider } from '@ethersproject/providers';
import { Choice, EvmNetworkConfig } from '../../types';

export type AddressConfig = {
  addr: string;
  params: string;
};

export type IndexedConfig = {
  index: number;
  params: string;
};

export type StrategyConfig = {
  index: number;
  address: string;
  params: string;
  metadata?: Record<string, any>;
};

export type ClientOpts = {
  networkConfig: EvmNetworkConfig;
  whitelistServerUrl: string;
  provider: Provider;
};

export type ClientConfig = {
  networkConfig: EvmNetworkConfig;
  whitelistServerUrl: string;
  provider: Provider;
};

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

export type Call = {
  abi: ContractInterface;
  args: any[];
};

export type Authenticator = {
  type: string;
  createCall(
    envelope: Envelope<Propose | UpdateProposal | Vote>,
    selector: string,
    calldata: string[]
  ): Call;
};

export type Strategy = {
  type: string;
  getParams(
    call: 'propose' | 'vote',
    strategyConfig: StrategyConfig,
    signerAddress: string,
    metadata: Record<string, any> | null,
    data: Propose | Vote,
    clientConfig: ClientConfig
  ): Promise<string>;
  getVotingPower(
    strategyAddress: string,
    voterAddress: string,
    metadata: Record<string, any> | null,
    block: number | null,
    params: string,
    provider: Provider
  ): Promise<bigint>;
};

export type SignatureData = {
  address: string;
  signature: string;
  domain: TypedDataDomain;
  types: Record<string, TypedDataField[]>;
  message: Record<string, any>;
};

export type Envelope<T extends Propose | UpdateProposal | Vote> = {
  signatureData?: SignatureData;
  data: T;
};

export type EIP712ProposeMessage = {
  space: string;
  author: string;
  metadataURI: string;
  executionStrategy: AddressConfig;
  userProposalValidationParams: string;
  salt: number;
};

export type EIP712UpdateProposalMessage = {
  space: string;
  author: string;
  proposalId: number;
  executionStrategy: AddressConfig;
  metadataURI: string;
  salt: number;
};

export type EIP712VoteMessage = {
  space: string;
  voter: string;
  proposalId: number;
  choice: number;
  userVotingStrategies: IndexedConfig[];
  voteMetadataURI: string;
};
