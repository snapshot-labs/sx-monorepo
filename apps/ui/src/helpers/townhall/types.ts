import {
  CategoryFieldsFragment,
  PostFieldsFragment,
  RoleFieldsFragment,
  SpaceFieldsFragment,
  TopicFieldsFragment,
  VoteFieldsFragment
} from './gql/graphql';

export type Space = SpaceFieldsFragment;
export type Category = CategoryFieldsFragment;
export type Topic = TopicFieldsFragment;
export type Post = PostFieldsFragment;
export type Vote = VoteFieldsFragment;
export type Role = RoleFieldsFragment;

export type RoleConfig = Omit<Role, 'space'>;
