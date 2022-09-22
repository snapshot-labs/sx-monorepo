import type { Call } from 'starknet';
import type { Choice } from './utils/choice';

export interface Authenticator {
  type: string;
  createCall(envelope: Envelope<Message>, selector: string, calldata: string[]): Call;
}

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

export type ClientConfig = {
  ethUrl: string;
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
  proposerAddress: string;
  executionParamsHash: string;
  usedVotingStrategiesHash: string;
  userVotingStrategyParamsFlatHash: string;
  salt: number;
};
export type EthSigVoteMessage = Vote & {
  voterAddress: string;
  usedVotingStrategiesHash: string;
  userVotingStrategyParamsFlatHash: string;
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
