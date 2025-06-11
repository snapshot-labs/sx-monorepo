import {
  PostFieldsFragment,
  RoleFieldsFragment,
  SpaceFieldsFragment,
  TopicFieldsFragment,
  VoteFieldsFragment
} from './gql/graphql';

export type Space = SpaceFieldsFragment;
export type Topic = TopicFieldsFragment;
export type Post = PostFieldsFragment;
export type Vote = VoteFieldsFragment;
export type Role = RoleFieldsFragment;
