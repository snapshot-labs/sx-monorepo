import { TOWNHALL_CONFIG } from '@snapshot-labs/sx';
import Agent from '../highlight/agent';
import Process from '../highlight/process';

export default class Townhall extends Agent {
  constructor(id: string, process: Process) {
    super(id, process);

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

  async topic(
    {
      space,
      title,
      body,
      discussionUrl
    }: { space: number; title: string; body: string; discussionUrl: string },
    { signer }: { signer: string }
  ) {
    const id: number = (await this.get(`space:${space}:topics:id`)) || 1;

    const author = await this.getSigner(signer);
    this.write(`space:${space}:topics:id`, id + 1);
    this.emit('new_topic', [space, id, author, title, body, discussionUrl]);
  }

  async closeTopic({ space, topic }: { space: number; topic: number }) {
    this.emit('close_topic', [space, topic]);
  }

  async post(
    {
      space,
      topic,
      body
    }: {
      space: number;
      topic: number;
      body: string;
    },
    { signer }: { signer: string }
  ) {
    // @TODO: reject the post if it was already proposed

    const id: number =
      (await this.get(`space:${space}:topic:${topic}:posts:id`)) || 1;

    const author = await this.getSigner(signer);

    this.write(`space:${space}:topic:${topic}:posts:id`, id + 1);
    this.emit('new_post', [space, topic, id, author, body]);
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
    name,
    description,
    color
  }: {
    space: number;
    name: string;
    description: string;
    color: string;
  }) {
    const id: number = (await this.get(`roles:id`)) ?? 0;
    this.write(`roles:id`, id + 1);

    this.emit('new_role', [space, String(id), name, description, color]);
  }

  async editRole({
    space,
    id,
    name,
    description,
    color
  }: {
    space: number;
    id: string;
    name: string;
    description: string;
    color: string;
  }) {
    this.emit('edit_role', [space, id, name, description, color]);
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
