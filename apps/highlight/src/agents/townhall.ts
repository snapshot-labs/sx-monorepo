import {
  TOWNHALL_PERMISSIONS as PERMISSIONS,
  TOWNHALL_CONFIG
} from '@snapshot-labs/sx';
import Agent from '../highlight/agent';
import Process from '../highlight/process';

type RoleData = {
  permissionLevel: (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
};
export default class Townhall extends Agent {
  constructor(id: string, process: Process) {
    super(id, process);

    this.addEntrypoint(TOWNHALL_CONFIG.types.createSpace);
    this.addEntrypoint(TOWNHALL_CONFIG.types.createCategory);
    this.addEntrypoint(TOWNHALL_CONFIG.types.editCategory);
    this.addEntrypoint(TOWNHALL_CONFIG.types.deleteCategory);
    this.addEntrypoint(TOWNHALL_CONFIG.types.createTopic);
    this.addEntrypoint(TOWNHALL_CONFIG.types.closeTopic);
    this.addEntrypoint(TOWNHALL_CONFIG.types.createPost);
    this.addEntrypoint(TOWNHALL_CONFIG.types.hidePost);
    this.addEntrypoint(TOWNHALL_CONFIG.types.pinPost);
    this.addEntrypoint(TOWNHALL_CONFIG.types.unpinPost);
    this.addEntrypoint(TOWNHALL_CONFIG.types.vote);
    this.addEntrypoint(TOWNHALL_CONFIG.types.createRole);
    this.addEntrypoint(TOWNHALL_CONFIG.types.editRole);
    this.addEntrypoint(TOWNHALL_CONFIG.types.deleteRole);
    this.addEntrypoint(TOWNHALL_CONFIG.types.claimRole);
    this.addEntrypoint(TOWNHALL_CONFIG.types.revokeRole);
  }

  getSigner(signer: string) {
    return this.get(`aliases:${signer}`, 'aliases') ?? signer;
  }

  async getHasAdminRights(space: number, signer: string) {
    const isOwner = await this.get(`space:${space}:owner`);

    if (isOwner === signer) {
      return true;
    }

    const userRoles: string[] = await this.get(
      `space:${space}:userRoles:${signer}`
    );

    if (!userRoles) return false;

    for (const role of userRoles) {
      const roleData: RoleData | null = await this.get(
        `space:${space}:role:${role}`
      );

      if (roleData && roleData.permissionLevel === PERMISSIONS.ADMINISTRATOR) {
        return true;
      }
    }

    return false;
  }

  async getHasRoleClaimed(space: number, signer: string) {
    const userRoles: string[] = await this.get(
      `space:${space}:userRoles:${signer}`
    );

    if (!userRoles) return false;

    for (const role of userRoles) {
      const roleData: RoleData | null = await this.get(
        `space:${space}:role:${role}`
      );

      if (roleData) {
        return true;
      }
    }

    return false;
  }

  async createSpace(data: unknown, { signer }: { signer: string }) {
    const user = await this.getSigner(signer);

    const id: number = (await this.get('spaces:id')) ?? 1;
    this.write('spaces:id', id + 1);

    this.write(`space:${id}:owner`, user);

    this.emit('new_space', [id, user]);
  }

  async createCategory(
    {
      space,
      metadataUri,
      parentCategoryId
    }: {
      space: number;
      metadataUri: string;
      parentCategoryId: string | null;
    },
    { signer }: { signer: string }
  ) {
    const user = await this.getSigner(signer);

    const hasAdminRights = await this.getHasAdminRights(space, user);
    this.assert(hasAdminRights, 'You do not have admin rights for this space');

    const id: number = (await this.get(`space:${space}:categories:id`)) || 1;

    this.write(`space:${space}:categories:id`, id + 1);
    this.emit('new_category', [space, id, user, metadataUri, parentCategoryId]);
  }

  async editCategory(
    {
      space,
      id,
      metadataUri,
      parentCategoryId
    }: {
      space: number;
      id: number;
      metadataUri: string;
      parentCategoryId: string | null;
    },
    { signer }: { signer: string }
  ) {
    const user = await this.getSigner(signer);

    const hasAdminRights = await this.getHasAdminRights(space, user);
    this.assert(hasAdminRights, 'You do not have admin rights for this space');

    this.emit('edit_category', [
      space,
      id,
      user,
      metadataUri,
      parentCategoryId
    ]);
  }

  async deleteCategory(
    { space, id }: { space: number; id: number },
    { signer }: { signer: string }
  ) {
    const user = await this.getSigner(signer);

    const hasAdminRights = await this.getHasAdminRights(space, user);
    this.assert(hasAdminRights, 'You do not have admin rights for this space');

    this.emit('delete_category', [space, id, user]);
  }

  async topic(
    {
      space,
      category,
      metadataUri
    }: { space: number; category: number; metadataUri: string },
    { signer }: { signer: string }
  ) {
    const author = await this.getSigner(signer);

    const hasRoleClaimed = await this.getHasRoleClaimed(space, author);
    this.assert(hasRoleClaimed, 'You have not claimed a role in this space');

    const id: number = (await this.get(`space:${space}:topics:id`)) || 1;

    this.write(`space:${space}:topics:id`, id + 1);
    this.emit('new_topic', [space, id, category, author, metadataUri]);
  }

  async closeTopic({ space, topic }: { space: number; topic: number }) {
    this.emit('close_topic', [space, topic]);
  }

  async post(
    {
      space,
      topic,
      metadataUri
    }: {
      space: number;
      topic: number;
      metadataUri: string;
    },
    { signer }: { signer: string }
  ) {
    // @TODO: reject the post if it was already proposed
    const author = await this.getSigner(signer);

    const hasRoleClaimed = await this.getHasRoleClaimed(space, author);
    this.assert(hasRoleClaimed, 'You have not claimed a role in this space');

    const id: number =
      (await this.get(`space:${space}:topic:${topic}:posts:id`)) || 1;

    this.write(`space:${space}:topic:${topic}:posts:id`, id + 1);
    this.emit('new_post', [space, topic, id, author, metadataUri]);
  }

  async hidePost({
    space,
    topic,
    post
  }: {
    space: number;
    topic: number;
    post: number;
  }) {
    // @TODO: reject if not the author of the topic

    this.emit('hide_post', [space, topic, post]);
  }

  async pinPost({
    space,
    topic,
    post
  }: {
    space: number;
    topic: number;
    post: number;
  }) {
    // @TODO: reject if not the author of the topic

    this.emit('pin_post', [space, topic, post]);
  }

  async unpinPost({
    space,
    topic,
    post
  }: {
    space: number;
    topic: number;
    post: number;
  }) {
    // @TODO: reject if not the author of the topic

    this.emit('unpin_post', [space, topic, post]);
  }

  async vote(
    {
      space,
      topic,
      post,
      choice
    }: {
      space: number;
      topic: number;
      post: number;
      choice: number;
    },
    { signer }: { signer: string }
  ) {
    const author = await this.getSigner(signer);

    const votes: number[] =
      (await this.get(`space:${space}:topic:${topic}:voter:${author}`)) || [];

    this.assert(!votes.includes(post), 'already voted');
    votes.push(post);

    this.write(`space:${space}:topic:${topic}:voter:${author}`, votes);
    this.emit('new_vote', [space, topic, post, author, choice]);
  }

  async createRole(
    {
      space,
      permissionLevel,
      metadataUri
    }: {
      space: number;
      permissionLevel: RoleData['permissionLevel'];
      metadataUri: string;
    },
    { signer }: { signer: string }
  ) {
    const user = await this.getSigner(signer);

    const hasAdminRights = await this.getHasAdminRights(space, user);
    this.assert(hasAdminRights, 'You do not have admin rights for this space');

    const id: number = (await this.get(`roles:id`)) ?? 0;
    this.write(`roles:id`, id + 1);

    const roleData: RoleData = {
      permissionLevel
    };

    this.write(`space:${space}:role:${id}`, roleData);

    this.emit('new_role', [space, String(id), permissionLevel, metadataUri]);
  }

  async editRole(
    {
      space,
      id,
      permissionLevel,
      metadataUri
    }: {
      space: number;
      id: string;
      permissionLevel: RoleData['permissionLevel'];
      metadataUri: string;
    },
    { signer }: { signer: string }
  ) {
    const user = await this.getSigner(signer);

    const hasAdminRights = await this.getHasAdminRights(space, user);
    this.assert(hasAdminRights, 'You do not have admin rights for this space');

    const roleData: RoleData = {
      permissionLevel
    };

    this.write(`space:${space}:role:${id}`, roleData);

    this.emit('edit_role', [space, id, permissionLevel, metadataUri]);
  }

  async deleteRole(
    { space, id }: { space: number; id: string },
    { signer }: { signer: string }
  ) {
    const user = await this.getSigner(signer);

    const hasAdminRights = await this.getHasAdminRights(space, user);
    this.assert(hasAdminRights, 'You do not have admin rights for this space');

    this.delete(`space:${space}:role:${id}`);

    this.emit('delete_role', [space, id]);
  }

  async claimRole(
    { space, id }: { space: number; id: string },
    { signer }: { signer: string }
  ) {
    const user = await this.getSigner(signer);

    const userRoles: string[] = await this.get(
      `space:${space}:userRoles:${user}`
    );

    const newUserRoles = userRoles ? [...userRoles, id] : [id];

    this.write(`space:${space}:userRoles:${user}`, [...new Set(newUserRoles)]);

    this.emit('claim_role', [space, id, user]);
  }

  async revokeRole(
    { space, id }: { space: number; id: string },
    { signer }: { signer: string }
  ) {
    const user = await this.getSigner(signer);

    const userRoles: string[] = await this.get(
      `space:${space}:userRoles:${user}`
    );

    const newUserRoles = userRoles.filter(role => role !== id);

    this.write(`space:${space}:userRoles:${user}`, [...new Set(newUserRoles)]);

    this.emit('revoke_role', [space, id, user]);
  }
}
