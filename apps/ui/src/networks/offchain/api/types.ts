import { OSnapTransaction } from '@/helpers/osnap/transactions';
import {
  DelegationType,
  SpaceMetadataLabel,
  Theme,
  Transaction,
  VoteType
} from '@/types';
import {
  OffchainProposalTeFragmentFragment,
  OffchainRelatedSpaceFragmentFragment,
  OffchainSpaceFragmentFragment,
  OffchainStatementFragmentFragment,
  OffchainStrategyFragmentFragment,
  OffchainVoteFragmentFragment
} from './gql/graphql';

export type OSnapPlugin = {
  safes: {
    network: string;
    safeName: string;
    safeAddress: string;
    transactions: OSnapTransaction[];
  }[];
};

export type ReadOnlyExecutionPlugin = {
  safes: {
    safeName: string;
    safeAddress: string;
    chainId: number;
    transactions: Transaction[];
  }[];
};

type Override<
  T,
  U extends { [K in keyof U]: K extends keyof T ? unknown : never }
> = Omit<T, keyof U> & U;

type Strategy = { name: string; params: Record<string, any>; network: string };

type Validation = { name: string; params: Record<string, any> };

type DelegationPortal = {
  delegationType: DelegationType | 'compound-governor';
  delegationContract: string;
  delegationNetwork: string;
  delegationApi: string;
};

export type ApiRelatedSpace = OffchainRelatedSpaceFragmentFragment;

export type ApiSpace = Override<
  OffchainSpaceFragmentFragment,
  {
    voting: Override<
      OffchainSpaceFragmentFragment['voting'],
      {
        type: VoteType | '' | null;
        quorumType: 'default' | 'rejection';
        privacy: '' | 'shutter' | 'shutter-elgamal' | 'any';
      }
    >;
    delegationPortal: DelegationPortal | null;
    labels: SpaceMetadataLabel[];
    strategies: Strategy[];
    validation: Validation;
    voteValidation: Validation;
    plugins: Record<string, any>;
    skinSettings: Override<
      NonNullable<OffchainSpaceFragmentFragment['skinSettings']>,
      { theme: Theme | null }
    > | null;
  }
>;

// Uses the Te fragment, which extends `offchainProposalFragment` with the te_*
// fields. When private voting is disabled those fields are not fetched, so code
// must handle them being missing (see `queries.ts`).
export type ApiProposal = Override<
  OffchainProposalTeFragmentFragment,
  {
    type: VoteType;
    state: 'active' | 'pending' | 'closed';
    scores_state: 'invalid' | 'pending' | 'final';
    privacy: 'shutter' | 'shutter-elgamal' | '';
    quorumType: 'default' | 'rejection';
    space: Override<
      OffchainProposalTeFragmentFragment['space'],
      { labels: SpaceMetadataLabel[] }
    >;
    strategies: Strategy[];
    validation: Validation;
    plugins: Record<string, any>;
  }
>;

export type ApiVote = Override<
  OffchainVoteFragmentFragment,
  {
    choice: number | number[] | Record<string, number>;
  }
>;

export type ApiStrategy = OffchainStrategyFragmentFragment;

export type ApiStatement = Override<
  OffchainStatementFragmentFragment,
  { status: 'ACTIVE' | 'INACTIVE' }
>;
