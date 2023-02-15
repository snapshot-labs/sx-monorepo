import { ContractInterface } from '@ethersproject/contracts';
import type { Provider } from 'starknet';
import type { Call } from 'starknet';
import type { Envelope as EvmEnvelope } from '../clients/evm/types';
import type { Choice } from '../utils/choice';
import type { MetaTransaction } from '../utils/encoding';
import type { NetworkConfig } from './networkConfig';

export * from './networkConfig';

export type Authenticator<T extends 'starknet' | 'evm'> = {
  type: string;
  createCall(
    envelope: T extends 'starknet' ? Envelope<Message> : EvmEnvelope<Propose | Vote>,
    selector: string,
    calldata: string[]
  ): T extends 'starknet' ? Call : EthCall;
};

export interface Strategy {
  type: string;
  getParams(
    call: 'propose' | 'vote',
    address: string,
    index: number,
    envelope: Envelope<Message>,
    clientConfig: ClientConfig
  ): Promise<string[]>;
  getExtraProposeCalls(
    address: string,
    index: number,
    envelope: Envelope<Message>,
    clientConfig: ClientConfig
  ): Promise<Call[]>;
}

export type ClientOpts = {
  ethUrl: string;
  starkProvider: Provider;
  networkConfig?: NetworkConfig;
};

export type ClientConfig = {
  ethUrl: string;
  starkProvider: Provider;
  networkConfig: NetworkConfig;
};

export type EthereumSigClientOpts = ClientOpts & {
  manaUrl: string;
};

export type EthereumSigClientConfig = ClientConfig & {
  manaUrl: string;
};

export interface Propose {
  space: string;
  authenticator: string;
  strategies: number[];
  executor: string;
  executionParams: string[];
  metadataUri: string;
}

export interface Vote {
  space: string;
  authenticator: string;
  strategies: number[];
  proposal: number;
  choice: Choice;
}

export type VanillaProposeMessage = Propose;
export type VanillaVoteMessage = Vote;
export type EthSigProposeMessage = Propose & {
  author: string;
  executionHash: string;
  strategiesHash: string;
  strategiesParamsHash: string;
  salt: number;
};
export type EthSigVoteMessage = Vote & {
  voter: string;
  strategiesHash: string;
  strategiesParamsHash: string;
  salt: number;
};

export type Message =
  | VanillaProposeMessage
  | VanillaVoteMessage
  | EthSigProposeMessage
  | EthSigVoteMessage;

export type Envelope<T extends Message> = {
  address: string;
  sig: T extends EthSigProposeMessage | EthSigVoteMessage ? string : null;
  data: {
    message: T;
  };
};

export type StrategiesAddresses = { index: number; address: string }[];

export type ExecutionInput = {
  calls?: Call[];
  transactions?: MetaTransaction[];
};

export type EthCall = {
  abi: ContractInterface;
  args: any[];
};
