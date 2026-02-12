export const ballotTypes = {
  Ballot: [
    { name: 'proposalId', type: 'uint256' },
    { name: 'support', type: 'uint8' }
  ]
};

export const ballotWithReasonTypes = {
  Ballot: [
    { name: 'proposalId', type: 'uint256' },
    { name: 'support', type: 'uint8' },
    { name: 'reason', type: 'string' }
  ]
};
