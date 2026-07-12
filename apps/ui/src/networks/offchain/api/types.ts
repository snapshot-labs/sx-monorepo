import {
  DelegationType,
  SkinSettings,
  SpaceMetadataLabel,
  VoteType
} from '@/types';
import {
  OffchainProposalFragmentFragment,
  OffchainRelatedSpaceFragmentFragment,
  OffchainSpaceFragmentFragment,
  OffchainStrategyFragmentFragment,
  OffchainVoteFragmentFragment
} from './gql/graphql';

type Override<T, U> = Omit<T, keyof U> & U;

type Strategy = { name: string; network: string; params: Record<string, any> };

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
    strategies: Strategy[];
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
    privacy: 'shutter' | '';
    quorumType: 'default' | 'rejection';
    plugins: Record<string, any>;
    strategies: Strategy[];
    space: {
      id: string;
      name: string;
      avatar: string;
      network: string;
      admins: string[];
      moderators: string[];
      members: string[];
      symbol: string;
      labels: SpaceMetadataLabel[];
      terms: string;
    };
  }
>;

export type ApiVote = OffchainVoteFragmentFragment;

export type ApiStrategy = OffchainStrategyFragmentFragment;
