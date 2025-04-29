import { TypedDataDomain } from '@ethersproject/abstract-signer';

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
  discussionUrl: string;
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

export type CreateRole = {
  space: string;
  id: string;
  name: string;
  description: string;
  color: string;
};

export type EditRole = CreateRole;

export type DeleteRole = {
  space: string;
  id: string;
};
