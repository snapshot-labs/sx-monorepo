// This is combined ABI for all events in Governor including its extensions
export default [
  // IGovernor
  {
    type: 'event',
    name: 'ProposalCanceled',
    inputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'ProposalCreated',
    inputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256'
      },
      {
        name: 'proposer',
        type: 'address',
        indexed: false,
        internalType: 'address'
      },
      {
        name: 'targets',
        type: 'address[]',
        indexed: false,
        internalType: 'address[]'
      },
      {
        name: 'values',
        type: 'uint256[]',
        indexed: false,
        internalType: 'uint256[]'
      },
      {
        name: 'signatures',
        type: 'string[]',
        indexed: false,
        internalType: 'string[]'
      },
      {
        name: 'calldatas',
        type: 'bytes[]',
        indexed: false,
        internalType: 'bytes[]'
      },
      {
        name: 'voteStart',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256'
      },
      {
        name: 'voteEnd',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256'
      },
      {
        name: 'description',
        type: 'string',
        indexed: false,
        internalType: 'string'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'ProposalExecuted',
    inputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'ProposalQueued',
    inputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256'
      },
      {
        name: 'etaSeconds',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'VoteCast',
    inputs: [
      {
        name: 'voter',
        type: 'address',
        indexed: true,
        internalType: 'address'
      },
      {
        name: 'proposalId',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256'
      },
      {
        name: 'support',
        type: 'uint8',
        indexed: false,
        internalType: 'uint8'
      },
      {
        name: 'weight',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256'
      },
      {
        name: 'reason',
        type: 'string',
        indexed: false,
        internalType: 'string'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'VoteCastWithParams',
    inputs: [
      {
        name: 'voter',
        type: 'address',
        indexed: true,
        internalType: 'address'
      },
      {
        name: 'proposalId',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256'
      },
      {
        name: 'support',
        type: 'uint8',
        indexed: false,
        internalType: 'uint8'
      },
      {
        name: 'weight',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256'
      },
      {
        name: 'reason',
        type: 'string',
        indexed: false,
        internalType: 'string'
      },
      {
        name: 'params',
        type: 'bytes',
        indexed: false,
        internalType: 'bytes'
      }
    ],
    anonymous: false
  },
  // GovernorSettings
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
  // GovernorVotesQuorumFraction
  {
    type: 'event',
    name: 'QuorumNumeratorUpdated',
    inputs: [
      {
        name: 'oldQuorumNumerator',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256'
      },
      {
        name: 'newQuorumNumerator',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256'
      }
    ],
    anonymous: false
  },
  // GovernorTimelockControl
  {
    type: 'event',
    name: 'TimelockChange',
    inputs: [
      {
        name: 'oldTimelock',
        type: 'address',
        indexed: false,
        internalType: 'address'
      },
      {
        name: 'newTimelock',
        type: 'address',
        indexed: false,
        internalType: 'address'
      }
    ],
    anonymous: false
  }
] as const;
