export const domain = {
  name: 'SOC',
  version: '1',
  chainId: 31337
};

export const proposeTypes = {
  Propose: [
    { name: 'space', type: 'address' },
    { name: 'author', type: 'address' },
    { name: 'metadataUri', type: 'string' },
    { name: 'executionStrategy', type: 'Strategy' },
    { name: 'userVotingStrategies', type: 'IndexedStrategy[]' },
    { name: 'salt', type: 'uint256' }
  ],
  Strategy: [
    { name: 'addy', type: 'address' },
    { name: 'params', type: 'bytes' }
  ],
  IndexedStrategy: [
    { name: 'index', type: 'uint8' },
    { name: 'params', type: 'bytes' }
  ]
};

export const voteTypes = {
  Vote: [
    { name: 'space', type: 'address' },
    { name: 'voter', type: 'address' },
    { name: 'proposalId', type: 'uint256' },
    { name: 'choice', type: 'uint8' },
    { name: 'userVotingStrategies', type: 'IndexedStrategy[]' },
    { name: 'salt', type: 'uint256' }
  ],
  IndexedStrategy: [
    { name: 'index', type: 'uint8' },
    { name: 'params', type: 'bytes' }
  ]
};
