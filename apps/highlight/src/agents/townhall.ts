import Agent from '../highlight/agent';
import Process from '../highlight/process';

export const DISCUSSION_TYPES = {
  Discussion: [
    { name: 'title', type: 'string' },
    { name: 'body', type: 'string' }
  ]
};

export const CLOSE_DISCUSSION_TYPES = {
  CloseDiscussion: [{ name: 'discussion', type: 'uint64' }]
};

export const STATEMENT_TYPES = {
  Statement: [
    { name: 'discussion', type: 'uint64' },
    { name: 'statement', type: 'string' }
  ]
};

export const HIDE_STATEMENT_TYPES = {
  HideStatement: [
    { name: 'discussion', type: 'uint64' },
    { name: 'statement', type: 'int' }
  ]
};

export const PIN_STATEMENT_TYPES = {
  PinStatement: [
    { name: 'discussion', type: 'uint64' },
    { name: 'statement', type: 'uint64' }
  ]
};

export const UNPIN_STATEMENT_TYPES = {
  UnpinStatement: [
    { name: 'discussion', type: 'uint64' },
    { name: 'statement', type: 'uint64' }
  ]
};

export const VOTE_TYPES = {
  Vote: [
    { name: 'discussion', type: 'uint64' },
    { name: 'statement', type: 'uint64' },
    { name: 'choice', type: 'uint64' }
  ]
};

export default class Townhall extends Agent {
  constructor(id: string, process: Process) {
    super(id, process);

    this.addEntrypoint(DISCUSSION_TYPES);
    this.addEntrypoint(CLOSE_DISCUSSION_TYPES);
    this.addEntrypoint(STATEMENT_TYPES);
    this.addEntrypoint(HIDE_STATEMENT_TYPES);
    this.addEntrypoint(PIN_STATEMENT_TYPES);
    this.addEntrypoint(UNPIN_STATEMENT_TYPES);
    this.addEntrypoint(VOTE_TYPES);
  }

  getAuthor(signer: string) {
    return this.get(`aliases:${signer}`, 'aliases') ?? signer;
  }

  async discussion(
    { title, body }: { title: string; body: string },
    { signer }: { signer: string }
  ) {
    const id: number = (await this.get('discussions:id')) || 1;

    const author = await this.getAuthor(signer);
    this.write('discussions:id', id + 1);
    this.emit('new_discussion', [id, author, title, body]);
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
}
