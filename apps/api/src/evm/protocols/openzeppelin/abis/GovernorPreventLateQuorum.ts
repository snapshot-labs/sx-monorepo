export default [
  {
    type: 'event',
    name: 'ProposalExtended',
    inputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256'
      },
      {
        name: 'extendedDeadline',
        type: 'uint64',
        indexed: false,
        internalType: 'uint64'
      }
    ],
    anonymous: false
  }
] as const;
