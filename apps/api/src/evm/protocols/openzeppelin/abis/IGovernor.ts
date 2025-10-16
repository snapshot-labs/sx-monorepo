export default [
  {
    type: 'function',
    name: 'CLOCK_MODE',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'string',
        internalType: 'string'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'COUNTING_MODE',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'string',
        internalType: 'string'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'cancel',
    inputs: [
      {
        name: 'targets',
        type: 'address[]',
        internalType: 'address[]'
      },
      {
        name: 'values',
        type: 'uint256[]',
        internalType: 'uint256[]'
      },
      {
        name: 'calldatas',
        type: 'bytes[]',
        internalType: 'bytes[]'
      },
      {
        name: 'descriptionHash',
        type: 'bytes32',
        internalType: 'bytes32'
      }
    ],
    outputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'castVote',
    inputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: 'support',
        type: 'uint8',
        internalType: 'uint8'
      }
    ],
    outputs: [
      {
        name: 'balance',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'castVoteBySig',
    inputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: 'support',
        type: 'uint8',
        internalType: 'uint8'
      },
      {
        name: 'voter',
        type: 'address',
        internalType: 'address'
      },
      {
        name: 'signature',
        type: 'bytes',
        internalType: 'bytes'
      }
    ],
    outputs: [
      {
        name: 'balance',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'castVoteWithReason',
    inputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: 'support',
        type: 'uint8',
        internalType: 'uint8'
      },
      {
        name: 'reason',
        type: 'string',
        internalType: 'string'
      }
    ],
    outputs: [
      {
        name: 'balance',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'castVoteWithReasonAndParams',
    inputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: 'support',
        type: 'uint8',
        internalType: 'uint8'
      },
      {
        name: 'reason',
        type: 'string',
        internalType: 'string'
      },
      {
        name: 'params',
        type: 'bytes',
        internalType: 'bytes'
      }
    ],
    outputs: [
      {
        name: 'balance',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'castVoteWithReasonAndParamsBySig',
    inputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: 'support',
        type: 'uint8',
        internalType: 'uint8'
      },
      {
        name: 'voter',
        type: 'address',
        internalType: 'address'
      },
      {
        name: 'reason',
        type: 'string',
        internalType: 'string'
      },
      {
        name: 'params',
        type: 'bytes',
        internalType: 'bytes'
      },
      {
        name: 'signature',
        type: 'bytes',
        internalType: 'bytes'
      }
    ],
    outputs: [
      {
        name: 'balance',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'clock',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint48',
        internalType: 'uint48'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'execute',
    inputs: [
      {
        name: 'targets',
        type: 'address[]',
        internalType: 'address[]'
      },
      {
        name: 'values',
        type: 'uint256[]',
        internalType: 'uint256[]'
      },
      {
        name: 'calldatas',
        type: 'bytes[]',
        internalType: 'bytes[]'
      },
      {
        name: 'descriptionHash',
        type: 'bytes32',
        internalType: 'bytes32'
      }
    ],
    outputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    stateMutability: 'payable'
  },
  {
    type: 'function',
    name: 'getProposalId',
    inputs: [
      {
        name: 'targets',
        type: 'address[]',
        internalType: 'address[]'
      },
      {
        name: 'values',
        type: 'uint256[]',
        internalType: 'uint256[]'
      },
      {
        name: 'calldatas',
        type: 'bytes[]',
        internalType: 'bytes[]'
      },
      {
        name: 'descriptionHash',
        type: 'bytes32',
        internalType: 'bytes32'
      }
    ],
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
    name: 'getVotes',
    inputs: [
      {
        name: 'account',
        type: 'address',
        internalType: 'address'
      },
      {
        name: 'timepoint',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
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
    name: 'getVotesWithParams',
    inputs: [
      {
        name: 'account',
        type: 'address',
        internalType: 'address'
      },
      {
        name: 'timepoint',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: 'params',
        type: 'bytes',
        internalType: 'bytes'
      }
    ],
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
    name: 'hasVoted',
    inputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: 'account',
        type: 'address',
        internalType: 'address'
      }
    ],
    outputs: [
      {
        name: '',
        type: 'bool',
        internalType: 'bool'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'hashProposal',
    inputs: [
      {
        name: 'targets',
        type: 'address[]',
        internalType: 'address[]'
      },
      {
        name: 'values',
        type: 'uint256[]',
        internalType: 'uint256[]'
      },
      {
        name: 'calldatas',
        type: 'bytes[]',
        internalType: 'bytes[]'
      },
      {
        name: 'descriptionHash',
        type: 'bytes32',
        internalType: 'bytes32'
      }
    ],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    stateMutability: 'pure'
  },
  {
    type: 'function',
    name: 'name',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'string',
        internalType: 'string'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'proposalDeadline',
    inputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
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
    name: 'proposalEta',
    inputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
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
    name: 'proposalNeedsQueuing',
    inputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    outputs: [
      {
        name: '',
        type: 'bool',
        internalType: 'bool'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'proposalProposer',
    inputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'address'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'proposalSnapshot',
    inputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
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
    name: 'propose',
    inputs: [
      {
        name: 'targets',
        type: 'address[]',
        internalType: 'address[]'
      },
      {
        name: 'values',
        type: 'uint256[]',
        internalType: 'uint256[]'
      },
      {
        name: 'calldatas',
        type: 'bytes[]',
        internalType: 'bytes[]'
      },
      {
        name: 'description',
        type: 'string',
        internalType: 'string'
      }
    ],
    outputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'queue',
    inputs: [
      {
        name: 'targets',
        type: 'address[]',
        internalType: 'address[]'
      },
      {
        name: 'values',
        type: 'uint256[]',
        internalType: 'uint256[]'
      },
      {
        name: 'calldatas',
        type: 'bytes[]',
        internalType: 'bytes[]'
      },
      {
        name: 'descriptionHash',
        type: 'bytes32',
        internalType: 'bytes32'
      }
    ],
    outputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'quorum',
    inputs: [
      {
        name: 'timepoint',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
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
    name: 'state',
    inputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    outputs: [
      {
        name: '',
        type: 'uint8',
        internalType: 'enum IGovernor.ProposalState'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'supportsInterface',
    inputs: [
      {
        name: 'interfaceId',
        type: 'bytes4',
        internalType: 'bytes4'
      }
    ],
    outputs: [
      {
        name: '',
        type: 'bool',
        internalType: 'bool'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'version',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'string',
        internalType: 'string'
      }
    ],
    stateMutability: 'view'
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
  {
    type: 'error',
    name: 'GovernorAlreadyCastVote',
    inputs: [
      {
        name: 'voter',
        type: 'address',
        internalType: 'address'
      }
    ]
  },
  {
    type: 'error',
    name: 'GovernorAlreadyQueuedProposal',
    inputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        internalType: 'uint256'
      }
    ]
  },
  {
    type: 'error',
    name: 'GovernorDisabledDeposit',
    inputs: []
  },
  {
    type: 'error',
    name: 'GovernorInsufficientProposerVotes',
    inputs: [
      {
        name: 'proposer',
        type: 'address',
        internalType: 'address'
      },
      {
        name: 'votes',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: 'threshold',
        type: 'uint256',
        internalType: 'uint256'
      }
    ]
  },
  {
    type: 'error',
    name: 'GovernorInvalidProposalLength',
    inputs: [
      {
        name: 'targets',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: 'calldatas',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: 'values',
        type: 'uint256',
        internalType: 'uint256'
      }
    ]
  },
  {
    type: 'error',
    name: 'GovernorInvalidSignature',
    inputs: [
      {
        name: 'voter',
        type: 'address',
        internalType: 'address'
      }
    ]
  },
  {
    type: 'error',
    name: 'GovernorInvalidVoteParams',
    inputs: []
  },
  {
    type: 'error',
    name: 'GovernorInvalidVoteType',
    inputs: []
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
  },
  {
    type: 'error',
    name: 'GovernorNonexistentProposal',
    inputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        internalType: 'uint256'
      }
    ]
  },
  {
    type: 'error',
    name: 'GovernorNotQueuedProposal',
    inputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        internalType: 'uint256'
      }
    ]
  },
  {
    type: 'error',
    name: 'GovernorOnlyExecutor',
    inputs: [
      {
        name: 'account',
        type: 'address',
        internalType: 'address'
      }
    ]
  },
  {
    type: 'error',
    name: 'GovernorQueueNotImplemented',
    inputs: []
  },
  {
    type: 'error',
    name: 'GovernorRestrictedProposer',
    inputs: [
      {
        name: 'proposer',
        type: 'address',
        internalType: 'address'
      }
    ]
  },
  {
    type: 'error',
    name: 'GovernorUnableToCancel',
    inputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: 'account',
        type: 'address',
        internalType: 'address'
      }
    ]
  },
  {
    type: 'error',
    name: 'GovernorUnexpectedProposalState',
    inputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: 'current',
        type: 'uint8',
        internalType: 'enum IGovernor.ProposalState'
      },
      {
        name: 'expectedStates',
        type: 'bytes32',
        internalType: 'bytes32'
      }
    ]
  }
] as const;
