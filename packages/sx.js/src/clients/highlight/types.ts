import { TypedDataDomain } from '@ethersproject/abstract-signer';
import { TOWNHALL_PERMISSIONS } from '../../highlightConstants';

type PermissionLevel =
  (typeof TOWNHALL_PERMISSIONS)[keyof typeof TOWNHALL_PERMISSIONS];

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

export type CreateCategory = {
  space: number;
  metadataUri: string;
  parentCategoryId: number;
};

export type EditCategory = CreateCategory & { id: number };

export type DeleteCategory = {
  space: number;
  id: number;
};

export type CreateTopic = {
  space: number;
  category: number;
  metadataUri: string;
};

export type CloseTopic = {
  space: number;
  topic: number;
};

export type CreatePost = {
  space: number;
  topic: number;
  metadataUri: string;
};

export type HidePost = {
  space: number;
  topic: number;
  post: number;
};
export type PinPost = HidePost;
export type UnpinPost = HidePost;

export type Vote = {
  space: number;
  topic: number;
  post: number;
  choice: number;
};

export type CreateRole = {
  space: number;
  permissionLevel: PermissionLevel;
  metadataUri: string;
};

export type EditRole = CreateRole & { id: string };

export type DeleteRole = {
  space: number;
  id: string;
};
export type ClaimRole = DeleteRole;
export type RevokeRole = ClaimRole;
