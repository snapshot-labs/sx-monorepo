export const domain = {
  name: 'snapshot-x',
  version: '1',
  chainId: 1
};

export const domainTypes = {
  StarkNetDomain: [
    {
      name: 'name',
      type: 'felt'
    },
    {
      name: 'version',
      type: 'felt'
    },
    {
      name: 'chainId',
      type: 'felt'
    }
  ]
};

export const proposeTypes = {
  StarkNetDomain: domainTypes.StarkNetDomain,
  Propose: [
    { name: 'space', type: 'felt' },
    { name: 'executionHash', type: 'felt' },
    { name: 'metadataURI', type: 'felt' }
  ]
};

export const voteTypes = {
  StarkNetDomain: domainTypes.StarkNetDomain,
  Vote: [
    { name: 'space', type: 'felt' },
    { name: 'proposal', type: 'felt' },
    { name: 'choice', type: 'felt' }
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
