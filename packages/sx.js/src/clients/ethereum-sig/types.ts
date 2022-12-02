export const domain = {
  name: 'snapshot-x',
  version: '1',
  chainId: 5
};

export const proposeTypes = {
  Propose: [
    { name: 'authenticator', type: 'bytes32' },
    { name: 'space', type: 'bytes32' },
    { name: 'author', type: 'address' },
    { name: 'metadata_uri', type: 'string' },
    { name: 'executor', type: 'bytes32' },
    { name: 'execution_hash', type: 'bytes32' },
    { name: 'strategies_hash', type: 'bytes32' },
    { name: 'strategies_params_hash', type: 'bytes32' },
    { name: 'salt', type: 'uint256' }
  ]
};

export const voteTypes = {
  Vote: [
    { name: 'authenticator', type: 'bytes32' },
    { name: 'space', type: 'bytes32' },
    { name: 'voter', type: 'address' },
    { name: 'proposal', type: 'uint256' },
    { name: 'choice', type: 'uint256' },
    { name: 'strategies_hash', type: 'bytes32' },
    { name: 'strategies_params_hash', type: 'bytes32' },
    { name: 'salt', type: 'uint256' }
  ]
};
