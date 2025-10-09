export default [
  {
    inputs: [],
    stateMutability: 'nonpayable',
    type: 'constructor'
  },
  {
    inputs: [],
    name: 'DuplicateExecutionPayloadHash',
    type: 'error'
  },
  {
    inputs: [],
    name: 'ExecutionFailed',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'enum ProposalStatus',
        name: 'status',
        type: 'uint8'
      }
    ],
    name: 'InvalidProposalStatus',
    type: 'error'
  },
  {
    inputs: [],
    name: 'InvalidSpace',
    type: 'error'
  },
  {
    inputs: [],
    name: 'OnlyVetoGuardian',
    type: 'error'
  },
  {
    inputs: [],
    name: 'ProposalNotQueued',
    type: 'error'
  },
  {
    inputs: [],
    name: 'TimelockDelayNotMet',
    type: 'error'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint8',
        name: 'version',
        type: 'uint8'
      }
    ],
    name: 'Initialized',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'previousOwner',
        type: 'address'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'newOwner',
        type: 'address'
      }
    ],
    name: 'OwnershipTransferred',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'executionPayloadHash',
        type: 'bytes32'
      }
    ],
    name: 'ProposalExecuted',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'executionPayloadHash',
        type: 'bytes32'
      }
    ],
    name: 'ProposalQueued',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'executionPayloadHash',
        type: 'bytes32'
      }
    ],
    name: 'ProposalVetoed',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint256',
        name: 'newQuorum',
        type: 'uint256'
      }
    ],
    name: 'QuorumUpdated',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'space',
        type: 'address'
      }
    ],
    name: 'SpaceDisabled',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'space',
        type: 'address'
      }
    ],
    name: 'SpaceEnabled',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timelockDelay',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'newTimelockDelay',
        type: 'uint256'
      }
    ],
    name: 'TimelockDelaySet',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'owner',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'vetoGuardian',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'address[]',
        name: 'spaces',
        type: 'address[]'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'quorum',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timelockDelay',
        type: 'uint256'
      }
    ],
    name: 'TimelockExecutionStrategySetUp',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'to',
            type: 'address'
          },
          {
            internalType: 'uint256',
            name: 'value',
            type: 'uint256'
          },
          {
            internalType: 'bytes',
            name: 'data',
            type: 'bytes'
          },
          {
            internalType: 'enum Enum.Operation',
            name: 'operation',
            type: 'uint8'
          },
          {
            internalType: 'uint256',
            name: 'salt',
            type: 'uint256'
          }
        ],
        indexed: false,
        internalType: 'struct MetaTransaction',
        name: 'transaction',
        type: 'tuple'
      }
    ],
    name: 'TransactionExecuted',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'to',
            type: 'address'
          },
          {
            internalType: 'uint256',
            name: 'value',
            type: 'uint256'
          },
          {
            internalType: 'bytes',
            name: 'data',
            type: 'bytes'
          },
          {
            internalType: 'enum Enum.Operation',
            name: 'operation',
            type: 'uint8'
          },
          {
            internalType: 'uint256',
            name: 'salt',
            type: 'uint256'
          }
        ],
        indexed: false,
        internalType: 'struct MetaTransaction',
        name: 'transaction',
        type: 'tuple'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'executionTime',
        type: 'uint256'
      }
    ],
    name: 'TransactionQueued',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'vetoGuardian',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'newVetoGuardian',
        type: 'address'
      }
    ],
    name: 'VetoGuardianSet',
    type: 'event'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'space',
        type: 'address'
      }
    ],
    name: 'disableSpace',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'space',
        type: 'address'
      }
    ],
    name: 'enableSpace',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256'
      },
      {
        components: [
          {
            internalType: 'address',
            name: 'author',
            type: 'address'
          },
          {
            internalType: 'uint32',
            name: 'startBlockNumber',
            type: 'uint32'
          },
          {
            internalType: 'contract IExecutionStrategy',
            name: 'executionStrategy',
            type: 'address'
          },
          {
            internalType: 'uint32',
            name: 'minEndBlockNumber',
            type: 'uint32'
          },
          {
            internalType: 'uint32',
            name: 'maxEndBlockNumber',
            type: 'uint32'
          },
          {
            internalType: 'enum FinalizationStatus',
            name: 'finalizationStatus',
            type: 'uint8'
          },
          {
            internalType: 'bytes32',
            name: 'executionPayloadHash',
            type: 'bytes32'
          },
          {
            internalType: 'uint256',
            name: 'activeVotingStrategies',
            type: 'uint256'
          }
        ],
        internalType: 'struct Proposal',
        name: 'proposal',
        type: 'tuple'
      },
      {
        internalType: 'uint256',
        name: 'votesFor',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'votesAgainst',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'votesAbstain',
        type: 'uint256'
      },
      {
        internalType: 'bytes',
        name: 'payload',
        type: 'bytes'
      }
    ],
    name: 'execute',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'bytes',
        name: 'payload',
        type: 'bytes'
      }
    ],
    name: 'executeQueuedProposal',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'author',
            type: 'address'
          },
          {
            internalType: 'uint32',
            name: 'startBlockNumber',
            type: 'uint32'
          },
          {
            internalType: 'contract IExecutionStrategy',
            name: 'executionStrategy',
            type: 'address'
          },
          {
            internalType: 'uint32',
            name: 'minEndBlockNumber',
            type: 'uint32'
          },
          {
            internalType: 'uint32',
            name: 'maxEndBlockNumber',
            type: 'uint32'
          },
          {
            internalType: 'enum FinalizationStatus',
            name: 'finalizationStatus',
            type: 'uint8'
          },
          {
            internalType: 'bytes32',
            name: 'executionPayloadHash',
            type: 'bytes32'
          },
          {
            internalType: 'uint256',
            name: 'activeVotingStrategies',
            type: 'uint256'
          }
        ],
        internalType: 'struct Proposal',
        name: 'proposal',
        type: 'tuple'
      },
      {
        internalType: 'uint256',
        name: 'votesFor',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'votesAgainst',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: 'votesAbstain',
        type: 'uint256'
      }
    ],
    name: 'getProposalStatus',
    outputs: [
      {
        internalType: 'enum ProposalStatus',
        name: '',
        type: 'uint8'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getStrategyType',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string'
      }
    ],
    stateMutability: 'pure',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'space',
        type: 'address'
      }
    ],
    name: 'isSpaceEnabled',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address'
      },
      {
        internalType: 'address',
        name: '',
        type: 'address'
      },
      {
        internalType: 'uint256[]',
        name: '',
        type: 'uint256[]'
      },
      {
        internalType: 'uint256[]',
        name: '',
        type: 'uint256[]'
      },
      {
        internalType: 'bytes',
        name: '',
        type: 'bytes'
      }
    ],
    name: 'onERC1155BatchReceived',
    outputs: [
      {
        internalType: 'bytes4',
        name: '',
        type: 'bytes4'
      }
    ],
    stateMutability: 'pure',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address'
      },
      {
        internalType: 'address',
        name: '',
        type: 'address'
      },
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256'
      },
      {
        internalType: 'bytes',
        name: '',
        type: 'bytes'
      }
    ],
    name: 'onERC1155Received',
    outputs: [
      {
        internalType: 'bytes4',
        name: '',
        type: 'bytes4'
      }
    ],
    stateMutability: 'pure',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address'
      },
      {
        internalType: 'address',
        name: '',
        type: 'address'
      },
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256'
      },
      {
        internalType: 'bytes',
        name: '',
        type: 'bytes'
      }
    ],
    name: 'onERC721Received',
    outputs: [
      {
        internalType: 'bytes4',
        name: '',
        type: 'bytes4'
      }
    ],
    stateMutability: 'pure',
    type: 'function'
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32'
      }
    ],
    name: 'proposalExecutionTime',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'quorum',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_quorum',
        type: 'uint256'
      }
    ],
    name: 'setQuorum',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'newTimelockDelay',
        type: 'uint256'
      }
    ],
    name: 'setTimelockDelay',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'bytes',
        name: 'initParams',
        type: 'bytes'
      }
    ],
    name: 'setUp',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'newVetoGuardian',
        type: 'address'
      }
    ],
    name: 'setVetoGuardian',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'bytes4',
        name: 'interfaceId',
        type: 'bytes4'
      }
    ],
    name: 'supportsInterface',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool'
      }
    ],
    stateMutability: 'pure',
    type: 'function'
  },
  {
    inputs: [],
    name: 'timelockDelay',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'newOwner',
        type: 'address'
      }
    ],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'executionPayloadHash',
        type: 'bytes32'
      }
    ],
    name: 'veto',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'vetoGuardian',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    stateMutability: 'payable',
    type: 'receive'
  }
] as const;
