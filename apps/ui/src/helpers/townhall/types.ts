import {
  DiscussionFieldsFragment,
  RoleFieldsFragment,
  SpaceFieldsFragment,
  StatementFieldsFragment,
  VoteFieldsFragment
} from './gql/graphql';

export type Space = SpaceFieldsFragment;
export type Discussion = DiscussionFieldsFragment;
export type Statement = StatementFieldsFragment;
export type Vote = VoteFieldsFragment;
export type Role = RoleFieldsFragment;
