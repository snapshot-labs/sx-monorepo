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

export type ApiRelatedSpace = OffchainRelatedSpaceFragmentFragment;

export type ApiSpace = Override<
  OffchainSpaceFragmentFragment,
  {
    symbol: string;
    terms: string;
    voting: SpaceVoting;
    delegationPortal: DelegationPortal | null;
    plugins: Record<string, any>;
    skinSettings: SkinSettings;
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
    space: Override<
      OffchainProposalFragmentFragment['space'],
      { symbol: string; terms: string; labels: SpaceMetadataLabel[] }
    >;
  }
>;

export type ApiVote = OffchainVoteFragmentFragment;

export type ApiStrategy = OffchainStrategyFragmentFragment;
