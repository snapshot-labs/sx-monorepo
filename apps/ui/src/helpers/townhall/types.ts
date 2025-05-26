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

export type Category = {
  id: string;
  parent_id: number;
  name: string;
  about: string;
  created: number;
};
