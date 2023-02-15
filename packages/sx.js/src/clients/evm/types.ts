import type { TypedDataDomain, TypedDataField } from '@ethersproject/abstract-signer';
import type { Propose, Vote } from '../../types';

export type AddressConfig = {
  addy: string;
  params: string;
};

export type IndexedConfig = {
  index: number;
  params: string;
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
  executionStrategy: AddressConfig;
  userVotingStrategies: IndexedConfig[];
  salt: number;
};

export type EIP712VoteMessage = {
  space: string;
  voter: string;
  proposalId: number;
  choice: number;
  userVotingStrategies: IndexedConfig[];
  salt: number;
};
