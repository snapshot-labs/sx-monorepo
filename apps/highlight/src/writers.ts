import { getAddress } from '@ethersproject/address';
import { evm } from '@snapshot-labs/checkpoint';
import { register } from '@snapshot-labs/checkpoint/dist/src/register';
import {
  HIGHLIGHT_DOMAIN,
  TOWNHALL_CONFIG,
  TOWNHALL_PERMISSIONS
} from '@snapshot-labs/sx';
import kebabCase from 'lodash.kebabcase';
import { PosterAbi } from './abi';
import { verifySignature } from './signatures';
import {
  Category,
  Post,
  Role,
  Salt,
  Space,
  Topic,
  User,
  UserRole,
  Vote
} from '../.checkpoint/models';
import { getJSON } from './utils';

const INDEXER_NAME = 'townhall';

type Envelope = {
  domain: {
    name: string;
    version: string;
    chainId: number;
    salt: string;
    verifyingContract: string;
  };
  message: Record<string, any>;
  primaryType: string;
  signer: string;
  signature: string;
};

const PRIMARY_TYPE_TO_CONFIG_KEY: Record<
  string,
  keyof typeof TOWNHALL_CONFIG.types
> = {
  CreateSpace: 'createSpace',
  CreateCategory: 'createCategory',
  EditCategory: 'editCategory',
  DeleteCategory: 'deleteCategory',
  Topic: 'createTopic',
  CloseTopic: 'closeTopic',
  Post: 'createPost',
  HidePost: 'hidePost',
  PinPost: 'pinPost',
  UnpinPost: 'unpinPost',
  Vote: 'vote',
  CreateRole: 'createRole',
  EditRole: 'editRole',
  DeleteRole: 'deleteRole',
  ClaimRole: 'claimRole',
  RevokeRole: 'revokeRole'
};

function getKnex() {
  return register.getKnex();
}

async function getUserRolesForSpace(
  spaceId: number,
  signer: string
): Promise<Array<{ role: string }>> {
  const knex = getKnex();

  const rows = await knex('userroles')
    .select('role')
    .where('user', `${spaceId}/${signer}`)
    .where('_indexer', INDEXER_NAME)
    .whereRaw('upper_inf(block_range)');

  return rows || [];
}

async function getHasAdminRights(
  spaceId: number,
  signer: string
): Promise<boolean> {
  const space = await Space.loadEntity(spaceId.toString(), INDEXER_NAME);
  if (space && space.owner === signer) return true;

  const userRoles = await getUserRolesForSpace(spaceId, signer);

  for (const userRole of userRoles) {
    const role = await Role.loadEntity(userRole.role, INDEXER_NAME);
    if (role && role.isAdmin && !role.deleted) return true;
  }

  return false;
}

async function getHasRoleClaimed(
  spaceId: number,
  signer: string
): Promise<boolean> {
  const userRoles = await getUserRolesForSpace(spaceId, signer);

  for (const userRole of userRoles) {
    const role = await Role.loadEntity(userRole.role, INDEXER_NAME);
    if (role && !role.deleted) return true;
  }

  return false;
}

async function getNextSpaceId(): Promise<number> {
  const knex = getKnex();
  const result = (await knex('spaces')
    .max('space_id as maxId')
    .where('_indexer', INDEXER_NAME)
    .whereRaw('upper_inf(block_range)')
    .first()) as { maxId: number | null } | undefined;
  return (result?.maxId ?? 0) + 1;
}

async function getNextCategoryId(spaceId: number): Promise<number> {
  const knex = getKnex();
  const result = (await knex('categories')
    .max('category_id as maxId')
    .where('space', spaceId.toString())
    .where('_indexer', INDEXER_NAME)
    .whereRaw('upper_inf(block_range)')
    .first()) as { maxId: number | null } | undefined;
  return (result?.maxId ?? 0) + 1;
}

async function getNextTopicId(spaceId: number): Promise<number> {
  const knex = getKnex();
  const result = (await knex('topics')
    .max('topic_id as maxId')
    .where('space', spaceId.toString())
    .where('_indexer', INDEXER_NAME)
    .whereRaw('upper_inf(block_range)')
    .first()) as { maxId: number | null } | undefined;
  return (result?.maxId ?? 0) + 1;
}

async function getNextPostId(
  spaceId: number,
  topicId: number
): Promise<number> {
  const knex = getKnex();
  const result = (await knex('posts')
    .max('post_id as maxId')
    .where('topic', `${spaceId}/${topicId}`)
    .where('_indexer', INDEXER_NAME)
    .whereRaw('upper_inf(block_range)')
    .first()) as { maxId: number | null } | undefined;
  return (result?.maxId ?? 0) + 1;
}

async function getNextRoleId(): Promise<number> {
  const knex = getKnex();
  const result = (await knex('roles')
    .select(knex.raw('MAX(CAST(id AS INTEGER)) as "maxId"'))
    .where('_indexer', INDEXER_NAME)
    .whereRaw('upper_inf(block_range)')
    .first()) as { maxId: number | null } | undefined;
  return (result?.maxId ?? -1) + 1;
}

export function createWriters() {
  const handleNewPost: evm.Writer<typeof PosterAbi, 'NewPost'> = async ({
    event,
    block
  }) => {
    if (!event) return;

    const { content } = event.args;

    let envelope: Envelope;
    try {
      envelope = JSON.parse(content);
    } catch {
      return;
    }

    if (
      !envelope.domain ||
      !envelope.message ||
      !envelope.primaryType ||
      !envelope.signer ||
      !envelope.signature
    ) {
      return;
    }

    const configKey = PRIMARY_TYPE_TO_CONFIG_KEY[envelope.primaryType];
    if (!configKey) return;

    const types = TOWNHALL_CONFIG.types[configKey];
    if (!types) return;

    const verifyingDomain = {
      ...HIGHLIGHT_DOMAIN,
      chainId: envelope.domain.chainId,
      salt: envelope.domain.salt,
      verifyingContract: envelope.domain.verifyingContract
    };

    const isValid = await verifySignature(
      verifyingDomain,
      envelope.signer,
      types,
      envelope.message,
      envelope.signature
    );
    if (!isValid) return;

    const saltId = envelope.domain.salt;
    const existingSalt = await Salt.loadEntity(saltId, INDEXER_NAME);
    if (existingSalt) return;

    const signer = getAddress(envelope.signer);
    const message = envelope.message;
    const timestamp = block
      ? Number(block.timestamp)
      : Math.floor(Date.now() / 1000);

    try {
      await dispatch(envelope.primaryType, signer, message, timestamp);
    } catch {
      return;
    }

    const salt = new Salt(saltId, INDEXER_NAME);
    await salt.save();
  };

  async function dispatch(
    primaryType: string,
    signer: string,
    message: Record<string, any>,
    timestamp: number
  ) {
    switch (primaryType) {
      case 'CreateSpace':
        return handleCreateSpace(signer, timestamp);
      case 'CreateCategory':
        return handleCreateCategory(signer, message, timestamp);
      case 'EditCategory':
        return handleEditCategory(signer, message);
      case 'DeleteCategory':
        return handleDeleteCategory(signer, message);
      case 'Topic':
        return handleCreateTopic(signer, message, timestamp);
      case 'CloseTopic':
        return handleCloseTopic(signer, message);
      case 'Post':
        return handleCreatePost(signer, message, timestamp);
      case 'HidePost':
        return handleHidePost(signer, message);
      case 'PinPost':
        return handlePinPost(signer, message);
      case 'UnpinPost':
        return handleUnpinPost(signer, message);
      case 'Vote':
        return handleVote(signer, message, timestamp);
      case 'CreateRole':
        return handleCreateRole(signer, message, timestamp);
      case 'EditRole':
        return handleEditRole(signer, message);
      case 'DeleteRole':
        return handleDeleteRole(signer, message);
      case 'ClaimRole':
        return handleClaimRole(signer, message);
      case 'RevokeRole':
        return handleRevokeRole(signer, message);
      default:
        throw new Error(`Unknown primaryType: ${primaryType}`);
    }
  }

  async function handleCreateSpace(signer: string, timestamp: number) {
    const id = await getNextSpaceId();

    const space = new Space(id.toString(), INDEXER_NAME);
    space.space_id = id;
    space.owner = signer;
    space.created = timestamp;
    await space.save();
  }

  async function handleCreateCategory(
    signer: string,
    message: Record<string, any>,
    timestamp: number
  ) {
    const { space: spaceId, metadataUri, parentCategoryId } = message;

    if (!(await getHasAdminRights(spaceId, signer))) {
      throw new Error('No admin rights');
    }

    const id = await getNextCategoryId(spaceId);
    const metadata = await getJSON(metadataUri);

    const category = new Category(`${spaceId}/${id}`, INDEXER_NAME);
    category.category_id = id;
    category.space = spaceId.toString();
    category.name = metadata?.name || '';
    category.description = metadata?.description || '';
    category.parent_category_id = parentCategoryId;
    category.parent_category =
      parentCategoryId !== 0 ? `${spaceId}/${parentCategoryId}` : null;
    category.slug = kebabCase(metadata?.name || id.toString());
    category.created = timestamp;

    await category.save();
  }

  async function handleEditCategory(
    signer: string,
    message: Record<string, any>
  ) {
    const { space: spaceId, id, metadataUri } = message;

    if (!(await getHasAdminRights(spaceId, signer))) {
      throw new Error('No admin rights');
    }

    const category = await Category.loadEntity(
      `${spaceId}/${id}`,
      INDEXER_NAME
    );
    if (!category) return;

    const metadata = await getJSON(metadataUri);

    category.name = metadata?.name || '';
    category.description = metadata?.description || '';
    category.slug = kebabCase(metadata?.name || id.toString());
    await category.save();
  }

  async function handleDeleteCategory(
    signer: string,
    message: Record<string, any>
  ) {
    const { space: spaceId, id } = message;

    if (!(await getHasAdminRights(spaceId, signer))) {
      throw new Error('No admin rights');
    }

    const category = await Category.loadEntity(
      `${spaceId}/${id}`,
      INDEXER_NAME
    );
    if (!category) return;

    await category.delete();
  }

  async function handleCreateTopic(
    signer: string,
    message: Record<string, any>,
    timestamp: number
  ) {
    const { space: spaceId, category: categoryId, metadataUri } = message;

    if (!(await getHasRoleClaimed(spaceId, signer))) {
      throw new Error('No role claimed');
    }

    const id = await getNextTopicId(spaceId);
    const metadata = await getJSON(metadataUri);

    const spaceEntityId = spaceId.toString();
    const categoryEntityId = `${spaceId}/${categoryId}`;
    const topic = new Topic(`${spaceId}/${id}`, INDEXER_NAME);
    topic.category_id = categoryId;
    topic.category = categoryId !== 0 ? categoryEntityId : null;
    topic.topic_id = id;
    topic.space = spaceEntityId;
    topic.author = signer;
    topic.title = metadata?.title || '';
    topic.body = metadata?.body || '';
    topic.discussion_url = metadata?.discussionUrl || '';
    topic.post_count = 0;
    topic.vote_count = 0;
    topic.created = timestamp;

    let space = await Space.loadEntity(spaceEntityId, INDEXER_NAME);
    if (!space) {
      space = new Space(spaceEntityId, INDEXER_NAME);
    }
    space.topic_count += 1;

    const categoryEntity = await Category.loadEntity(
      categoryEntityId,
      INDEXER_NAME
    );
    if (categoryEntity) {
      categoryEntity.topic_count += 1;
      await categoryEntity.save();
    }

    await Promise.all([topic.save(), space.save()]);
  }

  async function handleCloseTopic(
    signer: string,
    message: Record<string, any>
  ) {
    const { space: spaceId, topic: topicId } = message;

    if (!(await getHasAdminRights(spaceId, signer))) {
      throw new Error('No admin rights');
    }

    const topic = await Topic.loadEntity(`${spaceId}/${topicId}`, INDEXER_NAME);
    if (topic) {
      topic.closed = true;
      await topic.save();
    }
  }

  async function handleCreatePost(
    signer: string,
    message: Record<string, any>,
    timestamp: number
  ) {
    const { space: spaceId, topic: topicId, metadataUri } = message;

    if (!(await getHasRoleClaimed(spaceId, signer))) {
      throw new Error('No role claimed');
    }

    const id = await getNextPostId(spaceId, topicId);
    const metadata = await getJSON(metadataUri);

    const post = new Post(`${spaceId}/${topicId}/${id}`, INDEXER_NAME);
    post.author = signer;
    post.body = metadata?.body || '';
    post.vote_count = 0;
    post.scores_1 = 0;
    post.scores_2 = 0;
    post.scores_3 = 0;
    post.created = timestamp;
    post.post_id = id;
    post.topic_id = topicId;
    post.space = spaceId.toString();
    post.topic = `${spaceId}/${topicId}`;

    await post.save();

    const topic = await Topic.loadEntity(`${spaceId}/${topicId}`, INDEXER_NAME);
    if (topic) {
      topic.post_count += 1;
      await topic.save();
    }
  }

  async function handleHidePost(
    signer: string,
    message: Record<string, any>
  ) {
    const { space: spaceId, topic: topicId, post: postId } = message;

    if (!(await getHasAdminRights(spaceId, signer))) {
      throw new Error('No admin rights');
    }

    const post = await Post.loadEntity(
      `${spaceId}/${topicId}/${postId}`,
      INDEXER_NAME
    );
    if (post) {
      post.hidden = true;
      await post.save();
    }
  }

  async function handlePinPost(
    signer: string,
    message: Record<string, any>
  ) {
    const { space: spaceId, topic: topicId, post: postId } = message;

    if (!(await getHasAdminRights(spaceId, signer))) {
      throw new Error('No admin rights');
    }

    const post = await Post.loadEntity(
      `${spaceId}/${topicId}/${postId}`,
      INDEXER_NAME
    );
    if (post) {
      post.pinned = true;
      await post.save();
    }
  }

  async function handleUnpinPost(
    signer: string,
    message: Record<string, any>
  ) {
    const { space: spaceId, topic: topicId, post: postId } = message;

    if (!(await getHasAdminRights(spaceId, signer))) {
      throw new Error('No admin rights');
    }

    const post = await Post.loadEntity(
      `${spaceId}/${topicId}/${postId}`,
      INDEXER_NAME
    );
    if (post) {
      post.pinned = false;
      await post.save();
    }
  }

  async function handleVote(
    signer: string,
    message: Record<string, any>,
    timestamp: number
  ) {
    const { space: spaceId, topic: topicId, post: postId, choice } = message;

    if (!(await getHasRoleClaimed(spaceId, signer))) {
      throw new Error('No role claimed');
    }

    const voteId = `${spaceId}/${topicId}/${postId}/${signer}`;
    const existingVote = await Vote.loadEntity(voteId, INDEXER_NAME);
    if (existingVote) {
      throw new Error('Already voted');
    }

    const spaceEntityId = spaceId.toString();
    const vote = new Vote(voteId, INDEXER_NAME);
    vote.voter = signer;
    vote.choice = choice;
    vote.created = timestamp;
    vote.topic_id = topicId;
    vote.post_id = postId;
    vote.space = spaceEntityId;
    vote.topic = `${spaceId}/${topicId}`;
    vote.post = `${spaceId}/${topicId}/${postId}`;

    await vote.save();

    const topic = await Topic.loadEntity(`${spaceId}/${topicId}`, INDEXER_NAME);
    const post = await Post.loadEntity(
      `${spaceId}/${topicId}/${postId}`,
      INDEXER_NAME
    );

    if (topic && post) {
      topic.vote_count += 1;
      post.vote_count += 1;
      post[`scores_${choice}` as 'scores_1' | 'scores_2' | 'scores_3'] += 1;

      await topic.save();
      await post.save();
    }

    let space = await Space.loadEntity(spaceEntityId, INDEXER_NAME);
    if (!space) {
      space = new Space(spaceEntityId, INDEXER_NAME);
    }
    space.vote_count += 1;
    await space.save();
  }

  async function handleCreateRole(
    signer: string,
    message: Record<string, any>,
    timestamp: number
  ) {
    const { space: spaceId, permissionLevel, metadataUri } = message;

    if (!(await getHasAdminRights(spaceId, signer))) {
      throw new Error('No admin rights');
    }

    const id = await getNextRoleId();
    const metadata = await getJSON(metadataUri);

    const role = new Role(id.toString(), INDEXER_NAME);
    role.space = spaceId.toString();
    role.name = metadata?.name || '';
    role.description = metadata?.description || '';
    role.color = metadata?.color || '';
    role.isAdmin = permissionLevel === TOWNHALL_PERMISSIONS.ADMINISTRATOR;
    role.created = timestamp;
    await role.save();
  }

  async function handleEditRole(
    signer: string,
    message: Record<string, any>
  ) {
    const { space: spaceId, id, permissionLevel, metadataUri } = message;

    if (!(await getHasAdminRights(spaceId, signer))) {
      throw new Error('No admin rights');
    }

    const metadata = await getJSON(metadataUri);

    const role = await Role.loadEntity(id.toString(), INDEXER_NAME);
    if (!role) return;

    role.space = spaceId.toString();
    role.name = metadata?.name || '';
    role.description = metadata?.description || '';
    role.color = metadata?.color || '';
    role.isAdmin = permissionLevel === TOWNHALL_PERMISSIONS.ADMINISTRATOR;
    await role.save();
  }

  async function handleDeleteRole(
    signer: string,
    message: Record<string, any>
  ) {
    const { space: spaceId, id } = message;

    if (!(await getHasAdminRights(spaceId, signer))) {
      throw new Error('No admin rights');
    }

    const role = await Role.loadEntity(id.toString(), INDEXER_NAME);
    if (!role) return;

    role.deleted = true;
    await role.save();
  }

  async function handleClaimRole(
    signer: string,
    message: Record<string, any>
  ) {
    const { space: spaceId, id } = message;
    const userId = `${spaceId}/${signer}`;

    let user = await User.loadEntity(userId, INDEXER_NAME);
    if (!user) user = new User(userId, INDEXER_NAME);
    await user.save();

    const userRoleId = `${userId}/${id}`;
    const existingUserRole = await UserRole.loadEntity(
      userRoleId,
      INDEXER_NAME
    );
    if (existingUserRole) return;

    const userRole = new UserRole(userRoleId, INDEXER_NAME);
    userRole.user = userId;
    userRole.role = id;
    await userRole.save();
  }

  async function handleRevokeRole(
    signer: string,
    message: Record<string, any>
  ) {
    const { space: spaceId, id } = message;

    const userId = `${spaceId}/${signer}`;
    let user = await User.loadEntity(userId, INDEXER_NAME);
    if (!user) user = new User(userId, INDEXER_NAME);
    await user.save();

    const userRole = await UserRole.loadEntity(`${userId}/${id}`, INDEXER_NAME);
    if (userRole) {
      await userRole.delete();
    }
  }

  return { handleNewPost };
}
