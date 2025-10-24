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

export type BaseTransaction = {
  to: string;
  data: string;
  value: string;
  salt: string;
};

export type SendTokenTransaction = BaseTransaction & {
  _type: 'sendToken';
  _form: {
    recipient: string;
    amount: string;
    token: {
      name: string;
      decimals: number;
      symbol: string;
      address: string;
    };
  };
};

export type SendNftTransaction = BaseTransaction & {
  _type: 'sendNft';
  _form: {
    recipient: string;
    sender: string;
    amount: string;
    nft: {
      type: string;
      address: string;
      id: string;
      name: string;
      collection?: string;
    };
  };
};

export type StakeTokenTransaction = BaseTransaction & {
  _type: 'stakeToken';
  _form: {
    recipient: string;
    args: any;
    amount: string;
  };
};

export type ContractCallTransaction = BaseTransaction & {
  _type: 'contractCall';
  _form: {
    abi: any[];
    recipient: string;
    method: string;
    args: any;
    amount?: string;
  };
};

export type RawTransaction = BaseTransaction & {
  _type: 'raw';
  _form: {
    recipient: string;
  };
};

export type Transaction =
  | SendTokenTransaction
  | SendNftTransaction
  | StakeTokenTransaction
  | ContractCallTransaction
  | RawTransaction;
