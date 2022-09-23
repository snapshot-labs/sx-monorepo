export const domain = {
  name: 'snapshot-x',
  version: '1',
  chainId: 5
};

export const proposeTypes = {
  Propose: [
    { name: 'authenticator', type: 'bytes32' },
    { name: 'space', type: 'bytes32' },
    { name: 'proposerAddress', type: 'bytes32' },
    { name: 'metadataUri', type: 'string' },
    { name: 'executor', type: 'bytes32' },
    { name: 'executionParamsHash', type: 'bytes32' },
    { name: 'usedVotingStrategiesHash', type: 'bytes32' },
    { name: 'userVotingStrategyParamsFlatHash', type: 'bytes32' },
    { name: 'salt', type: 'uint256' }
  ]
};

export const voteTypes = {
  Vote: [
    { name: 'authenticator', type: 'bytes32' },
    { name: 'space', type: 'bytes32' },
    { name: 'voterAddress', type: 'bytes32' },
    { name: 'proposal', type: 'uint256' },
    { name: 'choice', type: 'uint256' },
    { name: 'usedVotingStrategiesHash', type: 'bytes32' },
    { name: 'userVotingStrategyParamsFlatHash', type: 'bytes32' },
    { name: 'salt', type: 'uint256' }
  ]
};
