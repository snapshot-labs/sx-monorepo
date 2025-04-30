import {
  DiscussionFieldsFragment,
  RoleFieldsFragment,
  StatementFieldsFragment,
  VoteFieldsFragment
} from './gql/graphql';

export type Discussion = DiscussionFieldsFragment;
export type Statement = StatementFieldsFragment;
export type Vote = VoteFieldsFragment;
export type Role = RoleFieldsFragment;
