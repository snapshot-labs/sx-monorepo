import { TypedDataDomain } from '@ethersproject/abstract-signer';

export type PostMessageRequest = Message;

export type Domain = Required<TypedDataDomain>;

type Message = {
  domain: Domain;
  message: Record<string, unknown>;
  primaryType: string;
  signer: string;
  signature: string;
};

export type Unit = {
  id: number;
  version: string;
  timestamp: number;
  message: Message;
};

export interface GetUnitReceiptRequest {
  id: number;
}

export interface Storage {
  agent: string;
  key: string;
  value?: any;
}

export type Event = {
  agent: string;
  key: string;
  data: unknown[];
};
