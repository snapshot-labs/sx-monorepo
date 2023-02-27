import type { TypedDataDomain, TypedDataField } from '@ethersproject/abstract-signer';
import type { ContractInterface } from '@ethersproject/contracts';
import type { Choice } from '../../utils/choice';

export type StrategyConfig = {
  index: number;
  address: string;
};

export type Propose = {
  space: string;
  authenticator: string;
  strategies: StrategyConfig[];
  executor: StrategyConfig;
  executionParams: string;
  metadataUri: string;
};

export type Vote = {
  space: string;
  authenticator: string;
  strategies: StrategyConfig[];
  proposal: number;
  choice: Choice;
};

export type AddressConfig = {
  addy: string;
  params: string;
};

export type IndexedConfig = {
  index: number;
  params: string;
};

export type Call = {
  abi: ContractInterface;
  args: any[];
};

export type Authenticator = {
  type: string;
  createCall(envelope: Envelope<Propose | Vote>, selector: string, calldata: string[]): Call;
};

export type Strategy = {
  type: string;
  getParams(
    call: 'propose' | 'vote',
    strategyConfig: StrategyConfig,
    signerAddress: string,
    data: Propose | Vote
  ): Promise<string>;
};

export type SignatureData = {
  address: string;
  signature: string;
  domain: TypedDataDomain;
  types: Record<string, TypedDataField[]>;
  message: Record<string, any>;
};

export type Envelope<T extends Propose | Vote> = {
  signatureData?: SignatureData;
  data: T;
};

export type EIP712ProposeMessage = {
  space: string;
  author: string;
  metadataUri: string;
  executionStrategy: IndexedConfig;
  userVotingStrategies: IndexedConfig[];
  salt: number;
};

export type EIP712VoteMessage = {
  space: string;
  voter: string;
  proposalId: number;
  choice: number;
  userVotingStrategies: IndexedConfig[];
};
