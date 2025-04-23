import { TypedDataDomain } from '@ethersproject/abstract-signer';

export const domain = {
  name: 'highlight',
  version: '0.1.0'
};

export const aliasTypes = {
  Alias: [
    { name: 'from', type: 'address' },
    { name: 'alias', type: 'address' }
  ]
};

export type Envelope = {
  type: 'HIGHLIGHT_ENVELOPE';
  domain: Required<TypedDataDomain>;
  message: Record<string, unknown>;
  entrypoint: string;
  signer: string;
  signature: string;
};

export type SetAlias = {
  from: string;
  alias: string;
};
