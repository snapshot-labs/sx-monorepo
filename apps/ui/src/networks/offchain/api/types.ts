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
    name: string;
    avatar: string;
    cover: string | null;
    network: string;
    proposalsCount: number;
    votesCount: number;
    followersCount: number;
    activeProposals: number;
    turbo: boolean;
    verified: boolean;
  }
>;

export type ApiSpace = Override<
  OffchainSpaceFragmentFragment,
  {
    name: string;
    network: string;
    symbol: string;
    terms: string;
    verified: boolean;
    turbo: boolean;
    turboExpiration: number;
    activeProposals: number;
    proposalsCount: number;
    proposalsCount1d: number;
    proposalsCount30d: number;
    votesCount: number;
    followersCount: number;
    admins: string[];
    members: string[];
    moderators: string[];
    categories: string[];
    treasuries: Treasury[];
    labels: Label[];
    strategies: Strategy[];
    filters: { minScore: number; onlyMembers: boolean };
    validation: Validation;
    voteValidation: Validation;
    voting: SpaceVoting;
    delegationPortal: DelegationPortal | null;
    plugins: Record<string, any>;
    boost: { enabled: boolean; bribeEnabled: boolean };
    skinSettings: SkinSettings;
    children: ApiRelatedSpace[];
    parent: ApiRelatedSpace | null;
  }
>;

export type ApiProposal = Override<
  OffchainProposalFragmentFragment,
  {
    ipfs: string;
    body: string;
    snapshot: number;
    flagged: boolean;
    flagCode: number;
    type: VoteType;
    state: 'active' | 'pending' | 'closed';
    scores_state: 'invalid' | 'pending' | 'final';
    scores: number[];
    scores_total: number;
    choices: string[];
    labels: string[];
    votes: number;
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

export type ApiVote = Override<
  OffchainVoteFragmentFragment,
  {
    ipfs: string;
    vp: number;
    reason: string;
    proposal: { id: string };
  }
>;

export type ApiStrategy = Override<
  OffchainStrategyFragmentFragment,
  {
    author: string;
    spacesCount: number;
    verifiedSpacesCount: number;
    disabled: boolean;
  }
>;
