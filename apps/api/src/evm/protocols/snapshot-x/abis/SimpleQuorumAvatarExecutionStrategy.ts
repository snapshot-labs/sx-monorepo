export default [
  {
    type: 'constructor',
    inputs: [
      {
        name: '_owner',
        type: 'address',
        internalType: 'address'
      },
      {
        name: '_target',
        type: 'address',
        internalType: 'address'
      },
      {
        name: '_spaces',
        type: 'address[]',
        internalType: 'address[]'
      },
      {
        name: '_quorum',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'disableSpace',
    inputs: [
      {
        name: 'space',
        type: 'address',
        internalType: 'address'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'enableSpace',
    inputs: [
      {
        name: 'space',
        type: 'address',
        internalType: 'address'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'execute',
    inputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: 'proposal',
        type: 'tuple',
        internalType: 'struct Proposal',
        components: [
          {
            name: 'author',
            type: 'address',
            internalType: 'address'
          },
          {
            name: 'startBlockNumber',
            type: 'uint32',
            internalType: 'uint32'
          },
          {
            name: 'executionStrategy',
            type: 'address',
            internalType: 'contract IExecutionStrategy'
          },
          {
            name: 'minEndBlockNumber',
            type: 'uint32',
            internalType: 'uint32'
          },
          {
            name: 'maxEndBlockNumber',
            type: 'uint32',
            internalType: 'uint32'
          },
          {
            name: 'finalizationStatus',
            type: 'uint8',
            internalType: 'enum FinalizationStatus'
          },
          {
            name: 'executionPayloadHash',
            type: 'bytes32',
            internalType: 'bytes32'
          },
          {
            name: 'activeVotingStrategies',
            type: 'uint256',
            internalType: 'uint256'
          }
        ]
      },
      {
        name: 'votesFor',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: 'votesAgainst',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: 'votesAbstain',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: 'payload',
        type: 'bytes',
        internalType: 'bytes'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'getProposalStatus',
    inputs: [
      {
        name: 'proposal',
        type: 'tuple',
        internalType: 'struct Proposal',
        components: [
          {
            name: 'author',
            type: 'address',
            internalType: 'address'
          },
          {
            name: 'startBlockNumber',
            type: 'uint32',
            internalType: 'uint32'
          },
          {
            name: 'executionStrategy',
            type: 'address',
            internalType: 'contract IExecutionStrategy'
          },
          {
            name: 'minEndBlockNumber',
            type: 'uint32',
            internalType: 'uint32'
          },
          {
            name: 'maxEndBlockNumber',
            type: 'uint32',
            internalType: 'uint32'
          },
          {
            name: 'finalizationStatus',
            type: 'uint8',
            internalType: 'enum FinalizationStatus'
          },
          {
            name: 'executionPayloadHash',
            type: 'bytes32',
            internalType: 'bytes32'
          },
          {
            name: 'activeVotingStrategies',
            type: 'uint256',
            internalType: 'uint256'
          }
        ]
      },
      {
        name: 'votesFor',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: 'votesAgainst',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: 'votesAbstain',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    outputs: [
      {
        name: '',
        type: 'uint8',
        internalType: 'enum ProposalStatus'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'getStrategyType',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'string',
        internalType: 'string'
      }
    ],
    stateMutability: 'pure'
  },
  {
    type: 'function',
    name: 'isSpaceEnabled',
    inputs: [
      {
        name: 'space',
        type: 'address',
        internalType: 'address'
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
    name: 'owner',
    inputs: [],
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
    name: 'quorum',
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
    name: 'renounceOwnership',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'setQuorum',
    inputs: [
      {
        name: '_quorum',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'setTarget',
    inputs: [
      {
        name: '_target',
        type: 'address',
        internalType: 'address'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'setUp',
    inputs: [
      {
        name: 'initParams',
        type: 'bytes',
        internalType: 'bytes'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'target',
    inputs: [],
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
    name: 'transferOwnership',
    inputs: [
      {
        name: 'newOwner',
        type: 'address',
        internalType: 'address'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'event',
    name: 'AvatarExecutionStrategySetUp',
    inputs: [
      {
        name: '_owner',
        type: 'address',
        indexed: false,
        internalType: 'address'
      },
      {
        name: '_target',
        type: 'address',
        indexed: false,
        internalType: 'address'
      },
      {
        name: '_spaces',
        type: 'address[]',
        indexed: false,
        internalType: 'address[]'
      },
      {
        name: '_quorum',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'Initialized',
    inputs: [
      {
        name: 'version',
        type: 'uint8',
        indexed: false,
        internalType: 'uint8'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'OwnershipTransferred',
    inputs: [
      {
        name: 'previousOwner',
        type: 'address',
        indexed: true,
        internalType: 'address'
      },
      {
        name: 'newOwner',
        type: 'address',
        indexed: true,
        internalType: 'address'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'QuorumUpdated',
    inputs: [
      {
        name: 'newQuorum',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'SpaceDisabled',
    inputs: [
      {
        name: 'space',
        type: 'address',
        indexed: false,
        internalType: 'address'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'SpaceEnabled',
    inputs: [
      {
        name: 'space',
        type: 'address',
        indexed: false,
        internalType: 'address'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'TargetSet',
    inputs: [
      {
        name: 'newTarget',
        type: 'address',
        indexed: true,
        internalType: 'address'
      }
    ],
    anonymous: false
  },
  {
    type: 'error',
    name: 'ExecutionFailed',
    inputs: []
  },
  {
    type: 'error',
    name: 'InvalidProposalStatus',
    inputs: [
      {
        name: 'status',
        type: 'uint8',
        internalType: 'enum ProposalStatus'
      }
    ]
  },
  {
    type: 'error',
    name: 'InvalidSpace',
    inputs: []
  }
] as const;
