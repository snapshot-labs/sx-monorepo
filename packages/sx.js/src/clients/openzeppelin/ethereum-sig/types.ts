export const ballotTypesV4 = {
  Ballot: [
    { name: 'proposalId', type: 'uint256' },
    { name: 'support', type: 'uint8' }
  ]
};

export const ballotTypesV5 = {
  Ballot: [
    { name: 'proposalId', type: 'uint256' },
    { name: 'support', type: 'uint8' },
    { name: 'voter', type: 'address' },
    { name: 'nonce', type: 'uint256' }
  ]
};

export const extendedBallotTypesV5 = {
  ExtendedBallot: [
    { name: 'proposalId', type: 'uint256' },
    { name: 'support', type: 'uint8' },
    { name: 'voter', type: 'address' },
    { name: 'nonce', type: 'uint256' },
    { name: 'reason', type: 'string' },
    { name: 'params', type: 'bytes' }
  ]
};
