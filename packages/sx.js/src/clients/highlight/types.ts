import { TypedDataDomain } from '@ethersproject/abstract-signer';

export const domain = {
  name: 'highlight',
  version: '0.1.0'
};

export const aliasTypes = {
  SetAlias: [
    { name: 'from', type: 'address' },
    { name: 'alias', type: 'address' }
  ]
};

export const discussionTypes = {
  Discussion: [
    { name: 'title', type: 'string' },
    { name: 'body', type: 'string' }
  ]
};

export const closeDiscussionTypes = {
  CloseDiscussion: [{ name: 'discussion', type: 'uint64' }]
};

export const statementTypes = {
  Statement: [
    { name: 'discussion', type: 'uint64' },
    { name: 'statement', type: 'string' }
  ]
};

export const hideStatementTypes = {
  HideStatement: [
    { name: 'discussion', type: 'uint64' },
    { name: 'statement', type: 'uint64' }
  ]
};

export const pinStatementTypes = {
  PinStatement: [
    { name: 'discussion', type: 'uint64' },
    { name: 'statement', type: 'uint64' }
  ]
};

export const unpinStatementTypes = {
  UnpinStatement: [
    { name: 'discussion', type: 'uint64' },
    { name: 'statement', type: 'uint64' }
  ]
};

export const voteTypes = {
  Vote: [
    { name: 'discussion', type: 'uint64' },
    { name: 'statement', type: 'uint64' },
    { name: 'choice', type: 'uint64' }
  ]
};

export type Envelope = {
  type: 'HIGHLIGHT_ENVELOPE';
  domain: Required<TypedDataDomain>;
  message: Record<string, unknown>;
  primaryType: string;
  signer: string;
  signature: string;
};

export type SetAlias = {
  from: string;
  alias: string;
};

export type CreateDiscussion = {
  title: string;
  body: string;
};

export type CloseDiscussion = {
  discussion: number;
};

export type CreateStatement = {
  discussion: number;
  statement: string;
};

export type HideStatement = {
  discussion: number;
  statement: number;
};
export type PinStatement = HideStatement;
export type UnpinStatement = HideStatement;

export type Vote = {
  discussion: number;
  statement: number;
  choice: number;
};
