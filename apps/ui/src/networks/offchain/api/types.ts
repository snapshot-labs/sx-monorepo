import { DelegationType, SkinSettings, VoteType } from '@/types';
import {
  OffchainProposalFragmentFragment,
  OffchainRelatedSpaceFragmentFragment,
  OffchainSpaceFragmentFragment,
  OffchainStrategyFragmentFragment,
  OffchainVoteFragmentFragment
} from './gql/graphql';

type Override<T, U> = Omit<T, keyof U> & U;

type Treasury = { name: string; network: string; address: string };
type Label = { id: string; name: string; description: string; color: string };
type Strategy = { name: string; network: string; params: Record<string, any> };
type Validation = { name: string; params: Record<string, any> };

type SpaceVoting = {
  delay: number | null;
  period: number | null;
  type: VoteType | '' | null;
  quorum: number | null;
  quorumType: 'default' | 'rejection';
  privacy: '' | 'shutter' | 'any';
  hideAbstain: boolean | null;
};

type DelegationPortal = {
  delegationType: DelegationType | 'compound-governor';
  delegationContract: string;
  delegationNetwork: string;
  delegationApi: string;
};

export type ApiRelatedSpace = Override<
  OffchainRelatedSpaceFragmentFragment,
  {
    network: string;
  }
>;

export type ApiSpace = Override<
  OffchainSpaceFragmentFragment,
  {
    network: string;
    symbol: string;
    terms: string;
    admins: string[];
    members: string[];
    moderators: string[];
    categories: string[];
    treasuries: Treasury[];
    labels: Label[];
    strategies: Strategy[];
    validation: Validation;
    voteValidation: Validation;
    voting: SpaceVoting;
    delegationPortal: DelegationPortal | null;
    plugins: Record<string, any>;
    skinSettings: SkinSettings;
    children: ApiRelatedSpace[];
    parent: ApiRelatedSpace | null;
  }
>;

export type ApiProposal = Override<
  OffchainProposalFragmentFragment,
  {
    type: VoteType;
    state: 'active' | 'pending' | 'closed';
    scores_state: 'invalid' | 'pending' | 'final';
    scores: number[];
    choices: string[];
    labels: string[];
    privacy: 'shutter' | '';
    quorumType: 'default' | 'rejection';
    plugins: Record<string, any>;
    strategies: Strategy[];
    validation: Validation;
    space: {
      id: string;
      name: string;
      avatar: string;
      network: string;
      admins: string[];
      moderators: string[];
      members: string[];
      symbol: string;
      labels: Label[];
      terms: string;
    };
  }
>;

export type ApiVote = OffchainVoteFragmentFragment;

export type ApiStrategy = Override<
  OffchainStrategyFragmentFragment,
  {
    author: string;
  }
>;
