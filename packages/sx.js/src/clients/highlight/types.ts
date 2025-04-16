export const domain = {
  name: 'highlight',
  version: '0.1.0'
};

export const aliasTypes = {
  Alias: [
    { name: 'from', type: 'address' },
    { name: 'alias', type: 'address' },
    { name: 'salt', type: 'uint256' }
  ]
};

export type Envelope = {
  type: 'HIGHLIGHT_ENVELOPE';
  from: string;
  to: string;
  data: string;
};

export type SetAlias = {
  from: string;
  alias: string;
  salt: bigint;
};
