export const domain = {
  name: 'snapshot-x',
  version: '1'
};

export const proposeTypes = {
  Propose: [
    { name: 'space', type: 'string' },
    { name: 'executionHash', type: 'string' },
    { name: 'metadataURI', type: 'string' }
  ]
};

export const voteTypes = {
  Vote: [
    { name: 'space', type: 'string' },
    { name: 'proposal', type: 'uint32' },
    { name: 'choice', type: 'uint32' }
  ]
};

export interface Propose {
  space: string;
  executionHash: string;
  metadataURI: string;
}

export interface Vote {
  space: string;
  proposal: number;
  choice: number;
}
