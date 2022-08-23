export interface Propose {
  space: string;
  authenticator: string;
  executionParams: string[];
  metadataURI: string;
}

export interface Vote {
  space: string;
  authenticator: string;
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

export type Envelope<
  T extends VanillaProposeMessage | VanillaVoteMessage | EthSigProposeMessage | EthSigVoteMessage
> = {
  address: string;
  sig: T extends EthSigProposeMessage | EthSigVoteMessage ? string : null;
  data: {
    message: T;
  };
};
