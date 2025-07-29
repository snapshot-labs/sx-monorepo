import { TOWNHALL_PERMISSIONS } from '@snapshot-labs/sx';
import kebabCase from 'lodash.kebabcase';
import { z } from 'zod';
import { Writer } from './indexer/types';
import {
  Alias,
  Category,
  Post,
  Role,
  Space,
  Topic,
  User,
  UserRole,
  Vote
} from '../../.checkpoint/models';
import { getJSON } from '../utils';

const SetAliasEventData = z.tuple([
  z.string(), // from
  z.string(), // to
  z.string() // salt
]);

const NewSpaceEventData = z.tuple([
  z.number(), // spaceId
  z.string() // owner
]);

const NewCategoryEventData = z.tuple([
  z.number(), // spaceId
  z.number(), // id
  z.string(), // author
  z.string(), // metadataUri
  z.number() // parentCategoryId
]);

const EditCategoryEventData = z.tuple([
  z.number(), // spaceId
  z.number(), // id
  z.string(), // author
  z.string(), // metadataUri
  z.number() // parentCategoryId
]);

const DeleteCategoryEventData = z.tuple([
  z.number(), // spaceId
  z.number(), // id
  z.string() // author
]);

const NewTopicEventData = z.tuple([
  z.number(), // spaceId
  z.number(), // id
  z.number(), // category
  z.string(), // author
  z.string() // metadataUri
]);

const CloseTopicEventData = z.tuple([
  z.number(), // spaceId
  z.number() // id
]);

const NewPostEventData = z.tuple([
  z.number(), // spaceId
  z.number(), // topicId
  z.number(), // id
  z.string(), // author
  z.string() // metadataUri
]);

const PinPostEventData = z.tuple([
  z.number(), // spaceId
  z.number(), // topicId
  z.number() // postId
]);
const UnpinPostEventData = PinPostEventData;
const HidePostEventData = PinPostEventData;

const NewVoteEventData = z.tuple([
  z.number(), // spaceId
  z.number(), // topicId
  z.number(), // postId
  z.string(), // voter
  z.union([z.literal(1), z.literal(2), z.literal(3)]) // choice
]);

const NewRoleEventData = z.tuple([
  z.number(), // spaceId
  z.string(), // id
  z.number(), // permissionLevel
  z.string() // metadataUri
]);
const EditRoleEventData = NewRoleEventData;

const DeleteRoleEventData = z.tuple([
  z.number(), // spaceId
  z.string() // id
]);

const ClaimRoleEventData = z.tuple([
  z.number(), // spaceId
  z.string(), // id
  z.string() // address
]);
const RevokeRoleEventData = ClaimRoleEventData;

export function createWriters(indexerName: string) {
  const handleSetAlias: Writer = async ({ unit, payload }) => {
    const [from, to] = SetAliasEventData.parse(payload.data);

    const alias = new Alias(`${from}/${to}`, indexerName);
    alias.address = from;
    alias.alias = to;
    alias.created = unit.timestamp;

    await alias.save();
  };

  const handleNewSpace: Writer = async ({ unit, payload }) => {
    const [spaceId, owner] = NewSpaceEventData.parse(payload.data);

    console.log('Handle new space', spaceId, owner);

    const space = new Space(spaceId.toString(), indexerName);
    space.space_id = spaceId;
    space.owner = owner;
    space.created = unit.timestamp;
    await space.save();
  };

  const handleNewCategory: Writer = async ({ unit, payload }) => {
    const [spaceId, id, author, metadataUri, parentCategoryId] =
      NewCategoryEventData.parse(payload.data);

    console.log(
      'Handle new category',
      spaceId,
      id,
      author,
      metadataUri,
      parentCategoryId
    );

    const metadata = await getJSON(metadataUri);

    const spaceEntityId = spaceId.toString();
    const category = new Category(`${spaceId}/${id}`, indexerName);
    category.category_id = id;
    category.space = spaceEntityId;
    category.name = metadata.name || '';
    category.description = metadata.description || '';
    category.parent_category_id = parentCategoryId;
    category.parent_category =
      parentCategoryId !== 0 ? `${spaceId}/${parentCategoryId}` : null;
    category.slug = kebabCase(metadata.name || id.toString());
    category.created = unit.timestamp;

    await category.save();
  };

  const handleEditCategory: Writer = async ({ payload }) => {
    const [spaceId, id, author, metadataUri, parentCategoryId] =
      EditCategoryEventData.parse(payload.data);

    console.log(
      'Handle edit category',
      spaceId,
      id,
      author,
      metadataUri,
      parentCategoryId
    );

    const category = await Category.loadEntity(`${spaceId}/${id}`, indexerName);
    if (!category) return;

    const metadata = await getJSON(metadataUri);

    category.name = metadata.name || '';
    category.description = metadata.description || '';
    category.slug = kebabCase(metadata.name || id.toString());
    await category.save();
  };

  const handleDeleteCategory: Writer = async ({ payload }) => {
    const [spaceId, id] = DeleteCategoryEventData.parse(payload.data);

    const category = await Category.loadEntity(`${spaceId}/${id}`, indexerName);
    if (!category) return;

    await category.delete();
  };

  const handleNewTopic: Writer = async ({ unit, payload }) => {
    const [spaceId, id, category, author, metadataUri] =
      NewTopicEventData.parse(payload.data);

    console.log('Handle new topic', spaceId, id, author, metadataUri);

    const metadata = await getJSON(metadataUri);

    const spaceEntityId = spaceId.toString();
    const categoryEntityId = `${spaceId}/${category}`;
    const topic = new Topic(`${spaceId}/${id}`, indexerName);
    topic.category_id = category;
    topic.category = category !== 0 ? categoryEntityId : null;
    topic.topic_id = id;
    topic.space = spaceEntityId;
    topic.author = author;
    topic.title = metadata.title || '';
    topic.body = metadata.body || '';
    topic.discussion_url = metadata.discussionUrl || '';
    topic.post_count = 0;
    topic.vote_count = 0;
    topic.created = unit.timestamp;

    let space = await Space.loadEntity(spaceEntityId, indexerName);
    if (!space) {
      space = new Space(spaceEntityId, indexerName);
    }
    space.topic_count += 1;

    const categoryEntity = await Category.loadEntity(
      categoryEntityId,
      indexerName
    );
    if (categoryEntity) {
      categoryEntity.topic_count += 1;
      await categoryEntity.save();
    }

    await Promise.all([topic.save(), space.save()]);
  };

  const handleCloseTopic: Writer = async ({ payload }) => {
    const [spaceId, topicId] = CloseTopicEventData.parse(payload.data);

    console.log('Handle close topic', spaceId, topicId);

    const topic = await Topic.loadEntity(`${spaceId}/${topicId}`, indexerName);

    if (topic) {
      topic.closed = true;

      await topic.save();
    }
  };

  const handleNewPost: Writer = async ({ unit, payload }) => {
    const [spaceId, topicId, id, author, metadataUri] = NewPostEventData.parse(
      payload.data
    );

    console.log('Handle new post', spaceId, id, author, topicId, metadataUri);

    const metadata = await getJSON(metadataUri);

    const post = new Post(`${spaceId}/${topicId}/${id}`, indexerName);
    post.author = author;
    post.body = metadata.body || '';
    post.vote_count = 0;
    post.scores_1 = 0;
    post.scores_2 = 0;
    post.scores_3 = 0;
    post.created = unit.timestamp;
    post.post_id = id;
    post.topic_id = topicId;
    post.space = spaceId.toString();
    post.topic = `${spaceId}/${topicId}`;

    await post.save();

    const topic = await Topic.loadEntity(`${spaceId}/${topicId}`, indexerName);

    if (topic) {
      topic.post_count += 1;

      await topic.save();
    }
  };

  const handlePinPost: Writer = async ({ payload }) => {
    const [spaceId, topicId, postId] = PinPostEventData.parse(payload.data);

    console.log('Handle pin post', spaceId, topicId, postId);

    const post = await Post.loadEntity(
      `${spaceId}/${topicId}/${postId}`,
      indexerName
    );

    if (post) {
      post.pinned = true;

      await post.save();
    }
  };

  const handleUnpinPost: Writer = async ({ payload }) => {
    const [spaceId, topicId, postId] = UnpinPostEventData.parse(payload.data);

    console.log('Handle unpin post', spaceId, topicId, postId);

    const post = await Post.loadEntity(
      `${spaceId}/${topicId}/${postId}`,
      indexerName
    );

    if (post) {
      post.pinned = false;

      await post.save();
    }
  };

  const handleHidePost: Writer = async ({ payload }) => {
    const [spaceId, topicId, postId] = HidePostEventData.parse(payload.data);

    console.log('Handle hide post', spaceId, topicId, postId);

    const post = await Post.loadEntity(
      `${spaceId}/${topicId}/${postId}`,
      indexerName
    );

    if (post) {
      post.hidden = true;

      await post.save();
    }
  };

  const handleNewVote: Writer = async ({ unit, payload }) => {
    const [spaceId, topicId, postId, voter, choice] = NewVoteEventData.parse(
      payload.data
    );

    console.log('Handle new vote', spaceId, voter, topicId, postId, choice);

    const spaceEntityId = spaceId.toString();
    const id = `${spaceId}/${topicId}/${postId}/${voter}`;
    const vote = new Vote(id, indexerName);
    vote.voter = voter;
    vote.choice = choice;
    vote.created = unit.timestamp;
    vote.topic_id = topicId;
    vote.post_id = postId;
    vote.space = spaceEntityId;
    vote.topic = `${spaceId}/${topicId}`;
    vote.post = `${spaceId}/${topicId}/${postId}`;

    await vote.save();

    const topic = await Topic.loadEntity(`${spaceId}/${topicId}`, indexerName);
    const post = await Post.loadEntity(
      `${spaceId}/${topicId}/${postId}`,
      indexerName
    );

    if (topic && post) {
      topic.vote_count += 1;
      post.vote_count += 1;
      post[`scores_${choice}`] += 1;

      await topic.save();
      await post.save();
    }

    let space = await Space.loadEntity(spaceEntityId, indexerName);
    if (!space) {
      space = new Space(spaceEntityId, indexerName);
    }
    space.vote_count += 1;

    await space.save();
  };

  const handleNewRole: Writer = async ({ unit, payload }) => {
    const [spaceId, id, permissionLevel, metadataUri] = NewRoleEventData.parse(
      payload.data
    );

    console.log('Handle new role', spaceId, id, permissionLevel, metadataUri);

    const metadata = await getJSON(metadataUri);

    const role = new Role(id.toString(), indexerName);
    role.space = spaceId.toString();
    role.name = metadata.name || '';
    role.description = metadata.description || '';
    role.color = metadata.color || '';
    role.isAdmin = permissionLevel === TOWNHALL_PERMISSIONS.ADMINISTRATOR;
    role.created = unit.timestamp;
    await role.save();
  };

  const handleEditRole: Writer = async ({ payload }) => {
    const [spaceId, id, permissionLevel, metadataUri] = EditRoleEventData.parse(
      payload.data
    );

    console.log('Handle edit role', spaceId, id, permissionLevel, metadataUri);

    const metadata = await getJSON(metadataUri);

    const role = await Role.loadEntity(id.toString(), indexerName);
    if (!role) return;

    role.space = spaceId.toString();
    role.name = metadata.name || '';
    role.description = metadata.description || '';
    role.color = metadata.color || '';
    role.isAdmin = permissionLevel === TOWNHALL_PERMISSIONS.ADMINISTRATOR;
    await role.save();
  };

  const handleDeleteRole: Writer = async ({ payload }) => {
    const [spaceId, id] = DeleteRoleEventData.parse(payload.data);

    console.log('Handle delete role', spaceId, id);

    const role = await Role.loadEntity(id.toString(), indexerName);
    if (!role) return;

    role.deleted = true;

    await role.save();
  };

  const handleClaimRole: Writer = async ({ payload }) => {
    const [spaceId, id, userAddress] = ClaimRoleEventData.parse(payload.data);

    console.log('Handle claim role', spaceId, id, userAddress);

    const userId = `${spaceId}/${userAddress}`;
    let user = await User.loadEntity(userId, indexerName);
    if (!user) user = new User(userId, indexerName);
    await user.save();

    let userRole = await UserRole.loadEntity(`${userId}/${id}`, indexerName);
    if (!userRole) {
      userRole = new UserRole(`${userId}/${id}`, indexerName);
      userRole.user = userId;
      userRole.role = id;
      await userRole.save();
    }
  };

  const handleRevokeRole: Writer = async ({ payload }) => {
    const [spaceId, id, userAddress] = RevokeRoleEventData.parse(payload.data);

    console.log('Handle revoke role', spaceId, id, userAddress);

    const userId = `${spaceId}/${userAddress}`;
    let user = await User.loadEntity(userId, indexerName);
    if (!user) user = new User(userId, indexerName);
    await user.save();

    const userRole = await UserRole.loadEntity(`${userId}/${id}`, indexerName);
    if (userRole) {
      await userRole.delete();
    }
  };

  return {
    // aliases
    handleSetAlias,
    // townhall
    handleNewSpace,
    handleNewCategory,
    handleEditCategory,
    handleDeleteCategory,
    handleNewTopic,
    handleCloseTopic,
    handleNewPost,
    handlePinPost,
    handleUnpinPost,
    handleHidePost,
    handleNewVote,
    handleNewRole,
    handleEditRole,
    handleDeleteRole,
    handleClaimRole,
    handleRevokeRole
  };
}
