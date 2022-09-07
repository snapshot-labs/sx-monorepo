export interface Propose {
  space: string;
  authenticator: string;
  strategies: string[];
  executionParams: string[];
  metadataURI: string;
}

export interface Vote {
  space: string;
  authenticator: string;
  strategies: string[];
  proposal: number;
  choice: number;
}

export type VanillaProposeMessage = Propose;
export type VanillaVoteMessage = Vote;
export type EthSigProposeMessage = Propose & {
  executionHash: string;
  salt: number;
};
export type EthSigVoteMessage = Vote & {
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

export type Metadata = {
  block: number;
  strategyParams: string[];
};
