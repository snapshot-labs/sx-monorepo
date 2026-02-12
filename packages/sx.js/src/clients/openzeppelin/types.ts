import {
  TypedDataDomain,
  TypedDataField
} from '@ethersproject/abstract-signer';
import { OpenZeppelinAuthenticator } from '../../types';

type Execution = {
  to: string;
  value: string;
  data: string;
};

export type Propose = {
  spaceId: string;
  title: string;
  body: string;
  executions: Execution[];
};

export type Vote = {
  spaceId: string;
  proposalId: string;
  choice: 0 | 1 | 2;
  reason?: string;
};

export type EIP712BallotV4 = {
  proposalId: string;
  support: number;
};

export type EIP712BallotV5 = {
  proposalId: string;
  support: number;
  voter: string;
  nonce: number;
};

export type EIP712ExtendedBallotV5 = {
  proposalId: string;
  support: number;
  voter: string;
  nonce: number;
  reason: string;
  params: string;
};

export type SignatureData = {
  authenticatorType: OpenZeppelinAuthenticator;
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
