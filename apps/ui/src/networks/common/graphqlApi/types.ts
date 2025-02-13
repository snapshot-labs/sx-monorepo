import { RequiredProperty } from '@/types';
import {
  ProposalFieldsFragment,
  SpaceFieldsFragment,
  VoteFieldsFragment
} from './gql/graphql';

export type ApiVote = VoteFieldsFragment;
export type ApiSpace = SpaceFieldsFragment;
export type ApiProposal = ProposalFieldsFragment;

export type ApiStrategyParsedMetadata = RequiredProperty<
  SpaceFieldsFragment['strategies_parsed_metadata'][number]
>;
export type ApiSpaceWithMetadata = ApiSpace & {
  metadata: NonNullable<ApiSpace['metadata']>;
  strategies_parsed_metadata: RequiredProperty<
    ApiSpace['strategies_parsed_metadata'][number]
  >[];
  voting_power_validation_strategies_parsed_metadata: RequiredProperty<
    ApiSpace['voting_power_validation_strategies_parsed_metadata'][number]
  >[];
};
export type ApiProposalWithMetadata = ApiProposal & {
  metadata: NonNullable<ApiProposal['metadata']>;
  space: NonNullable<ApiProposal['space']> & {
    metadata: NonNullable<ApiSpace['metadata']>;
    strategies_parsed_metadata: RequiredProperty<
      ApiProposal['space']['strategies_parsed_metadata'][number]
    >[];
  };
};
