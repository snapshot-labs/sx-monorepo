import { TOWNHALL_CONFIG } from '@snapshot-labs/sx';
import Agent from '../highlight/agent';
import Process from '../highlight/process';

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
    const id: number = (await this.get(`space:${space}:categories:id`)) || 1;

    const author = await this.getSigner(signer);
    this.write(`space:${space}:categories:id`, id + 1);
    this.emit('new_category', [
      space,
      id,
      author,
      metadataUri,
      parentCategoryId
    ]);
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
    const author = await this.getSigner(signer);
    this.emit('edit_category', [
      space,
      id,
      author,
      metadataUri,
      parentCategoryId
    ]);
  }

  async deleteCategory(
    { space, id }: { space: number; id: number },
    { signer }: { signer: string }
  ) {
    const author = await this.getSigner(signer);
    this.emit('delete_category', [space, id, author]);
  }

  async topic(
    {
      space,
      category,
      metadataUri
    }: { space: number; category: number; metadataUri: string },
    { signer }: { signer: string }
  ) {
    const id: number = (await this.get(`space:${space}:topics:id`)) || 1;

    const author = await this.getSigner(signer);

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

    const id: number =
      (await this.get(`space:${space}:topic:${topic}:posts:id`)) || 1;

    const author = await this.getSigner(signer);

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

  async createRole({
    space,
    metadataUri
  }: {
    space: number;
    metadataUri: string;
  }) {
    const id: number = (await this.get(`roles:id`)) ?? 0;
    this.write(`roles:id`, id + 1);

    this.emit('new_role', [space, String(id), metadataUri]);
  }

  async editRole({
    space,
    id,
    metadataUri
  }: {
    space: number;
    id: string;
    metadataUri: string;
  }) {
    this.emit('edit_role', [space, id, metadataUri]);
  }

  async deleteRole({ space, id }: { space: number; id: string }) {
    this.emit('delete_role', [space, id]);
  }

  async claimRole(
    { space, id }: { space: number; id: string },
    { signer }: { signer: string }
  ) {
    const user = await this.getSigner(signer);

    this.emit('claim_role', [space, id, user]);
  }

  async revokeRole(
    { space, id }: { space: number; id: string },
    { signer }: { signer: string }
  ) {
    const user = await this.getSigner(signer);

    this.emit('revoke_role', [space, id, user]);
  }
}
