export default [
  {
    type: 'function',
    name: 'proposalThreshold',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'setProposalThreshold',
    inputs: [
      {
        name: 'newProposalThreshold',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'setVotingDelay',
    inputs: [
      {
        name: 'newVotingDelay',
        type: 'uint48',
        internalType: 'uint48'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'setVotingPeriod',
    inputs: [
      {
        name: 'newVotingPeriod',
        type: 'uint32',
        internalType: 'uint32'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'votingDelay',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'votingPeriod',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'event',
    name: 'ProposalThresholdSet',
    inputs: [
      {
        name: 'oldProposalThreshold',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256'
      },
      {
        name: 'newProposalThreshold',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'VotingDelaySet',
    inputs: [
      {
        name: 'oldVotingDelay',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256'
      },
      {
        name: 'newVotingDelay',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'VotingPeriodSet',
    inputs: [
      {
        name: 'oldVotingPeriod',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256'
      },
      {
        name: 'newVotingPeriod',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256'
      }
    ],
    anonymous: false
  },
  {
    type: 'error',
    name: 'GovernorInvalidVotingPeriod',
    inputs: [
      {
        name: 'votingPeriod',
        type: 'uint256',
        internalType: 'uint256'
      }
    ]
  }
] as const;
