import type { Web3Provider } from '@ethersproject/providers';
import type { Signer } from '@ethersproject/abstract-signer';
import type { MetaTransaction } from '@snapshot-labs/sx/dist/utils/encoding';
import type { Space, Proposal, Vote, User, Choice } from '@/types';

export type PaginationOpts = { limit: number; skip?: number };
export type Connector =
  | 'argentx'
  | 'injected'
  | 'walletconnect'
  | 'walletlink'
  | 'portis'
  | 'gnosis';

export type StrategyTemplate = {
  address: string;
  name: string;
  paramsDefinition: any;
  generateSummary?: (params: Record<string, any>) => string;
  generateParams?: (params: Record<string, any>) => any[];
  deploy?: (
    client: any,
    signer: Signer,
    controller: string,
    params: Record<string, any>
  ) => Promise<string>;
};

export type StrategyConfig = StrategyTemplate & {
  id: string;
  params: Record<string, any>;
};

// TODO: make sx.js accept Signer instead of Web3Provider | Wallet

export type NetworkActions = {
  createSpace(
    web3: Web3Provider,
    params: {
      controller: string;
      votingDelay: number;
      minVotingDuration: number;
      maxVotingDuration: number;
      proposalThreshold: bigint;
      quorum: bigint;
      authenticators: string[];
      votingStrategies: string[];
      votingStrategiesParams: string[][];
      executionStrategies: StrategyConfig[];
      metadataUri: string;
    }
  );
  setMetadataUri(web3: Web3Provider, spaceId: string, metadataUri: string);
  propose(
    web3: Web3Provider,
    account: string,
    space: Space,
    cid: string,
    transactions: MetaTransaction[]
  );
  vote(web3: Web3Provider, account: string, proposal: Proposal, choice: Choice);
  finalizeProposal(web3: Web3Provider, proposal: Proposal);
  receiveProposal(web3: Web3Provider, proposal: Proposal);
  executeTransactions(web3: Web3Provider, proposal: Proposal);
  getVotingPower(
    web3: Web3Provider,
    strategiesAddresses: string[],
    strategiesParams: any[],
    voterAddress: string,
    timestamp: number
  ): Promise<bigint>;
  send(envelope: any): Promise<any>;
};

export type NetworkApi = {
  loadProposalVotes(proposal: Proposal): Promise<Vote[]>;
  loadUserVotes(voter: string): Promise<{ [key: string]: Vote }>;
  loadProposals(spaceId: string, paginationOpts: PaginationOpts): Promise<Proposal[]>;
  loadProposalsSummary(spaceId: string, limit: number): Promise<Proposal[]>;
  loadProposal(spaceId: string, proposalId: number): Promise<Proposal>;
  loadSpaces(paginationOpts: PaginationOpts): Promise<Space[]>;
  loadSpace(spaceId: string): Promise<Space>;
  loadUser(userId: string): Promise<User>;
};

export type Network = {
  name: string;
  hasReceive: boolean;
  managerConnectors: Connector[];
  actions: NetworkActions;
  api: NetworkApi;
  constants: {
    API_URL: string;
    SUPPORTED_AUTHENTICATORS: { [key: string]: boolean };
    SUPPORTED_STRATEGIES: { [key: string]: boolean };
    SUPPORTED_EXECUTORS: { [key: string]: boolean };
    AUTHS: { [key: string]: string };
    STRATEGIES: { [key: string]: string };
    EXECUTORS: { [key: string]: string };
    EDITOR_AUTHENTICATORS: StrategyTemplate[];
    EDITOR_VOTING_STRATEGIES: StrategyTemplate[];
    EDITOR_EXECUTION_STRATEGIES: StrategyTemplate[];
  };
  helpers: {
    pin: (content: any) => Promise<{ cid: string; provider: string }>;
    waitForTransaction(txId: string): Promise<any>;
    getExplorerUrl(id: string, type: 'transaction' | 'address' | 'contract'): string;
  };
};
