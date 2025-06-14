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
      title,
      body,
      discussionUrl
    }: { title: string; body: string; discussionUrl: string },
    { signer }: { signer: string }
  ) {
    const id: number = (await this.get('topics:id')) || 1;

    const author = await this.getSigner(signer);
    this.write('topics:id', id + 1);
    this.emit('new_topic', [id, author, title, body, discussionUrl]);
  }

  async closeTopic({ topic }: { topic: number }) {
    this.emit('close_topic', [topic]);
  }

  async post(
    {
      topic,
      body
    }: {
      topic: number;
      body: string;
    },
    { signer }: { signer: string }
  ) {
    // @TODO: reject the post if it was already proposed

    const id: number = (await this.get(`topic:${topic}:posts:id`)) || 1;

    const author = await this.getSigner(signer);

    this.write(`topic:${topic}:posts:id`, id + 1);
    this.emit('new_post', [id, author, topic, body]);
  }

  async hidePost({ topic, post }: { topic: number; post: number }) {
    // @TODO: reject if not the author of the topic

    this.emit('hide_post', [topic, post]);
  }

  async pinPost({ topic, post }: { topic: number; post: number }) {
    // @TODO: reject if not the author of the topic

    this.emit('pin_post', [topic, post]);
  }

  async unpinPost({ topic, post }: { topic: number; post: number }) {
    // @TODO: reject if not the author of the topic

    this.emit('unpin_post', [topic, post]);
  }

  async vote(
    {
      topic,
      post,
      choice
    }: {
      topic: number;
      post: number;
      choice: number;
    },
    { signer }: { signer: string }
  ) {
    const author = await this.getSigner(signer);

    const votes: number[] =
      (await this.get(`topic:${topic}:voter:${author}`)) || [];

    this.assert(!votes.includes(post), 'already voted');
    votes.push(post);

    this.write(`topic:${topic}:voter:${author}`, votes);
    this.emit('new_vote', [author, topic, post, choice]);
  }

  async createRole({
    space,
    name,
    description,
    color
  }: {
    space: string;
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
    space: string;
    id: string;
    name: string;
    description: string;
    color: string;
  }) {
    this.emit('edit_role', [space, id, name, description, color]);
  }

  async deleteRole({ space, id }: { space: string; id: string }) {
    this.emit('delete_role', [space, id]);
  }

  async claimRole(
    { space, id }: { space: string; id: string },
    { signer }: { signer: string }
  ) {
    const user = await this.getSigner(signer);

    this.emit('claim_role', [space, id, user]);
  }

  async revokeRole(
    { space, id }: { space: string; id: string },
    { signer }: { signer: string }
  ) {
    const user = await this.getSigner(signer);

    this.emit('revoke_role', [space, id, user]);
  }
}
