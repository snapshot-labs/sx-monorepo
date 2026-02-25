import {
  TypedDataDomain,
  TypedDataField
} from '@ethersproject/abstract-signer';
import { GovernorBravoAuthenticator, Transaction } from '../../types';

export type Propose = {
  spaceId: string;
  title: string;
  body: string;
  executions: Transaction[];
};

export type Vote = {
  spaceId: string;
  proposalId: number;
  choice: 0 | 1 | 2;
  reason?: string;
};

export type EIP712Ballot = {
  proposalId: number;
  support: number;
};

export type EIP712BallotWithReason = {
  proposalId: number;
  support: number;
  reason: string;
};

export type SignatureData = {
  authenticatorType: GovernorBravoAuthenticator;
  address: string;
  signature: string;
  domain: TypedDataDomain;
  types: Record<string, TypedDataField[]>;
  message: Record<string, any>;
};

export type Envelope<T extends Propose | Vote> = {
  data: T;
  signatureData?: SignatureData;
};
