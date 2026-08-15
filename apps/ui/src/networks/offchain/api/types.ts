import { DelegationType, VoteType } from '@/types';
import {
  OffchainProposalFragmentFragment,
  OffchainRelatedSpaceFragmentFragment,
  OffchainSpaceFragmentFragment,
  OffchainStatementFragmentFragment,
  OffchainStrategyFragmentFragment,
  OffchainVoteFragmentFragment
} from './gql/graphql';

type Override<
  T,
  U extends { [K in keyof U]: K extends keyof T ? unknown : never }
> = Omit<T, keyof U> & U;

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
        privacy: '' | 'shutter' | 'any';
      }
    >;
    delegationPortal: DelegationPortal | null;
    plugins: Record<string, any>;
  }
>;

export type ApiProposal = Override<
  OffchainProposalFragmentFragment,
  {
    type: VoteType;
    state: 'active' | 'pending' | 'closed';
    scores_state: 'invalid' | 'pending' | 'final';
    privacy: 'shutter' | '';
    quorumType: 'default' | 'rejection';
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

export type ApiStatement = OffchainStatementFragmentFragment;
