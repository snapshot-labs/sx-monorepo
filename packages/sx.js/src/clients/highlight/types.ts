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

export type CreateTopic = {
  space: string;
  title: string;
  body: string;
  discussionUrl: string;
};

export type CloseTopic = {
  space: string;
  topic: number;
};

export type CreatePost = {
  space: string;
  topic: number;
  body: string;
};

export type HidePost = {
  space: string;
  topic: number;
  post: number;
};
export type PinPost = HidePost;
export type UnpinPost = HidePost;

export type Vote = {
  space: string;
  topic: number;
  post: number;
  choice: number;
};

export type CreateRole = {
  space: string;
  name: string;
  description: string;
  color: string;
};

export type EditRole = CreateRole & { id: string };

export type DeleteRole = {
  space: string;
  id: string;
};
export type ClaimRole = DeleteRole;
export type RevokeRole = ClaimRole;
