import { TOWNHALL_CONFIG } from '@snapshot-labs/sx';
import Agent from '../highlight/agent';
import Process from '../highlight/process';

export default class Townhall extends Agent {
  constructor(id: string, process: Process) {
    super(id, process);

    this.addEntrypoint(TOWNHALL_CONFIG.types.createDiscussion);
    this.addEntrypoint(TOWNHALL_CONFIG.types.closeDiscussion);
    this.addEntrypoint(TOWNHALL_CONFIG.types.createStatement);
    this.addEntrypoint(TOWNHALL_CONFIG.types.hideStatement);
    this.addEntrypoint(TOWNHALL_CONFIG.types.pinStatement);
    this.addEntrypoint(TOWNHALL_CONFIG.types.unpinStatement);
    this.addEntrypoint(TOWNHALL_CONFIG.types.vote);
    this.addEntrypoint(TOWNHALL_CONFIG.types.createRole);
  }

  getAuthor(signer: string) {
    return this.get(`aliases:${signer}`, 'aliases') ?? signer;
  }

  async discussion(
    {
      title,
      body,
      discussionUrl
    }: { title: string; body: string; discussionUrl: string },
    { signer }: { signer: string }
  ) {
    const id: number = (await this.get('discussions:id')) || 1;

    const author = await this.getAuthor(signer);
    this.write('discussions:id', id + 1);
    this.emit('new_discussion', [id, author, title, body, discussionUrl]);
  }

  async closeDiscussion({ discussion }: { discussion: number }) {
    this.emit('close_discussion', [discussion]);
  }

  async statement(
    {
      discussion,
      statement: body
    }: {
      discussion: number;
      statement: string;
    },
    { signer }: { signer: string }
  ) {
    // @TODO: reject the statement if it was already proposed

    const id: number =
      (await this.get(`discussion:${discussion}:statements:id`)) || 1;

    const author = await this.getAuthor(signer);

    this.write(`discussion:${discussion}:statements:id`, id + 1);
    this.emit('new_statement', [id, author, discussion, body]);
  }

  async hideStatement({
    discussion,
    statement
  }: {
    discussion: number;
    statement: number;
  }) {
    // @TODO: reject if not the author of the discussion

    this.emit('hide_statement', [discussion, statement]);
  }

  async pinStatement({
    discussion,
    statement
  }: {
    discussion: number;
    statement: number;
  }) {
    // @TODO: reject if not the author of the discussion

    this.emit('pin_statement', [discussion, statement]);
  }

  async unpinStatement({
    discussion,
    statement
  }: {
    discussion: number;
    statement: number;
  }) {
    // @TODO: reject if not the author of the discussion

    this.emit('unpin_statement', [discussion, statement]);
  }

  async vote(
    {
      discussion,
      statement,
      choice
    }: {
      discussion: number;
      statement: number;
      choice: number;
    },
    { signer }: { signer: string }
  ) {
    const author = await this.getAuthor(signer);

    const votes: number[] =
      (await this.get(`discussion:${discussion}:voter:${author}`)) || [];

    this.assert(!votes.includes(statement), 'already voted');
    votes.push(statement);

    this.write(`discussion:${discussion}:voter:${author}`, votes);
    this.emit('new_vote', [author, discussion, statement, choice]);
  }

  async createRole({
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
    this.emit('new_role', [space, id, name, description, color]);
  }
}
