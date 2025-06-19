import { TOWNHALL_CONFIG } from '@snapshot-labs/sx';
import Agent from '../highlight/agent';
import Process from '../highlight/process';
import { getJSON } from '../utils';

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
    { space, metadataUri }: { space: number; metadataUri: string },
    { signer }: { signer: string }
  ) {
    const id: number = (await this.get('topics:id')) || 1;

    const author = await this.getSigner(signer);
    const metadata: any = await getJSON(metadataUri);

    this.write(`space:${space}:topics:id`, id + 1);
    this.emit('new_topic', [
      space,
      id,
      author,
      metadata.title || '',
      metadata.body || '',
      metadata.discussionUrl || ''
    ]);
  }

  async closeTopic({ topic }: { topic: number }) {
    this.emit('close_topic', [topic]);
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

    const id: number = (await this.get(`topic:${topic}:posts:id`)) || 1;

    const author = await this.getSigner(signer);
    const metadata: any = await getJSON(metadataUri);

    this.write(`space:${space}:topic:${topic}:posts:id`, id + 1);
    this.emit('new_post', [space, topic, id, author, metadata.body || '']);
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
    metadataUri
  }: {
    space: number;
    metadataUri: string;
  }) {
    const id: number = (await this.get(`roles:id`)) ?? 0;
    this.write(`roles:id`, id + 1);

    const metadata: any = await getJSON(metadataUri);

    this.emit('new_role', [
      space,
      String(id),
      metadata.name || '',
      metadata.description || '',
      metadata.color || ''
    ]);
  }

  async editRole({
    space,
    id,
    metadataUri
  }: {
    space: string;
    id: string;
    metadataUri: string;
  }) {
    const metadata: any = await getJSON(metadataUri);

    this.emit('edit_role', [
      space,
      id,
      metadata.name || '',
      metadata.description || '',
      metadata.color || ''
    ]);
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
