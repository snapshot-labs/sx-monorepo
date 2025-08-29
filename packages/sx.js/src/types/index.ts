import {
  TypedDataDomain,
  TypedDataField
} from '@ethersproject/abstract-signer';
import { Call, StarknetType } from 'starknet';
import { MetaTransaction } from '../utils/encoding';

export * from './networkConfig';

export enum Choice {
  Against = 0,
  For = 1,
  Abstain = 2
}

export type Privacy = 'shutter' | 'none';

// NOTE: This is shared between starknet and offchain clients.
// Maybe we should find a way to unify it more or split it.
export type SignatureData = {
  address: string;
  commitTxId?: string;
  commitHash?: string;
  signature?: string | string[];
  message?: Record<string, any>;
  domain?: TypedDataDomain;
  types?: Record<string, TypedDataField[] | StarknetType[]>;
  primaryType?: any;
};

export type ExecutionInput = {
  calls?: Call[];
  transactions?: MetaTransaction[];
  // ethRelayer
  destination?: string;
};
