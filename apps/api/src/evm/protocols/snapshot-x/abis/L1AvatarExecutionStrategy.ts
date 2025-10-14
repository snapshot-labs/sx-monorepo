export default [
  { inputs: [], stateMutability: 'nonpayable', type: 'constructor' },
  { inputs: [], name: 'ExecutionFailed', type: 'error' },
  { inputs: [], name: 'InvalidPayload', type: 'error' },
  {
    inputs: [
      { internalType: 'enum ProposalStatus', name: 'status', type: 'uint8' }
    ],
    name: 'InvalidProposalStatus',
    type: 'error'
  },
  { inputs: [], name: 'InvalidSpace', type: 'error' },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'newExecutionRelayer',
        type: 'uint256'
      }
    ],
    name: 'ExecutionRelayerSet',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'uint8', name: 'version', type: 'uint8' }
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
        name: '_owner',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'address',
        name: '_target',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'address',
        name: '_starknetCore',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: '_executionRelayer',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'uint256[]',
        name: '_starknetSpaces',
        type: 'uint256[]'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: '_quorum',
        type: 'uint256'
      }
    ],
    name: 'L1AvatarExecutionStrategySetUp',
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
        indexed: true,
        internalType: 'uint256',
        name: 'space',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'proposalId',
        type: 'uint256'
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
        internalType: 'uint256',
        name: 'space',
        type: 'uint256'
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
        internalType: 'uint256',
        name: 'space',
        type: 'uint256'
      }
    ],
    name: 'SpaceEnabled',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'newStarknetCore',
        type: 'address'
      }
    ],
    name: 'StarknetCoreSet',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'newTarget',
        type: 'address'
      }
    ],
    name: 'TargetSet',
    type: 'event'
  },
  {
    inputs: [{ internalType: 'uint256', name: 'space', type: 'uint256' }],
    name: 'disableSpace',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'uint256', name: 'space', type: 'uint256' }],
    name: 'enableSpace',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'space', type: 'uint256' },
      { internalType: 'uint256', name: 'proposalId', type: 'uint256' },
      {
        components: [
          { internalType: 'uint32', name: 'startTimestamp', type: 'uint32' },
          { internalType: 'uint32', name: 'minEndTimestamp', type: 'uint32' },
          { internalType: 'uint32', name: 'maxEndTimestamp', type: 'uint32' },
          {
            internalType: 'enum FinalizationStatus',
            name: 'finalizationStatus',
            type: 'uint8'
          },
          {
            internalType: 'uint256',
            name: 'executionPayloadHash',
            type: 'uint256'
          },
          {
            internalType: 'uint256',
            name: 'executionStrategy',
            type: 'uint256'
          },
          {
            internalType: 'uint256',
            name: 'authorAddressType',
            type: 'uint256'
          },
          { internalType: 'uint256', name: 'author', type: 'uint256' },
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
        components: [
          { internalType: 'uint256', name: 'votesFor', type: 'uint256' },
          { internalType: 'uint256', name: 'votesAgainst', type: 'uint256' },
          { internalType: 'uint256', name: 'votesAbstain', type: 'uint256' }
        ],
        internalType: 'struct Votes',
        name: 'votes',
        type: 'tuple'
      },
      { internalType: 'uint256', name: 'executionHash', type: 'uint256' },
      {
        components: [
          { internalType: 'address', name: 'to', type: 'address' },
          { internalType: 'uint256', name: 'value', type: 'uint256' },
          { internalType: 'bytes', name: 'data', type: 'bytes' },
          {
            internalType: 'enum Enum.Operation',
            name: 'operation',
            type: 'uint8'
          }
        ],
        internalType: 'struct MetaTransaction[]',
        name: 'transactions',
        type: 'tuple[]'
      }
    ],
    name: 'execute',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'executionRelayer',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        components: [
          { internalType: 'uint32', name: 'startTimestamp', type: 'uint32' },
          { internalType: 'uint32', name: 'minEndTimestamp', type: 'uint32' },
          { internalType: 'uint32', name: 'maxEndTimestamp', type: 'uint32' },
          {
            internalType: 'enum FinalizationStatus',
            name: 'finalizationStatus',
            type: 'uint8'
          },
          {
            internalType: 'uint256',
            name: 'executionPayloadHash',
            type: 'uint256'
          },
          {
            internalType: 'uint256',
            name: 'executionStrategy',
            type: 'uint256'
          },
          {
            internalType: 'uint256',
            name: 'authorAddressType',
            type: 'uint256'
          },
          { internalType: 'uint256', name: 'author', type: 'uint256' },
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
      { internalType: 'uint256', name: 'votesFor', type: 'uint256' },
      { internalType: 'uint256', name: 'votesAgainst', type: 'uint256' },
      { internalType: 'uint256', name: 'votesAbstain', type: 'uint256' }
    ],
    name: 'getProposalStatus',
    outputs: [{ internalType: 'enum ProposalStatus', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getStrategyType',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'pure',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'uint256', name: 'space', type: 'uint256' }],
    name: 'isSpaceEnabled',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'quorum',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
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
      { internalType: 'uint256', name: '_executionRelayer', type: 'uint256' }
    ],
    name: 'setExecutionRelayer',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'uint256', name: '_quorum', type: 'uint256' }],
    name: 'setQuorum',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: '_starknetCore', type: 'address' }
    ],
    name: 'setStarknetCore',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: '_target', type: 'address' }],
    name: 'setTarget',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: '_owner', type: 'address' },
      { internalType: 'address', name: '_target', type: 'address' },
      { internalType: 'address', name: '_starknetCore', type: 'address' },
      { internalType: 'uint256', name: '_executionRelayer', type: 'uint256' },
      { internalType: 'uint256[]', name: '_starknetSpaces', type: 'uint256[]' },
      { internalType: 'uint256', name: '_quorum', type: 'uint256' }
    ],
    name: 'setUp',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'starknetCore',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'target',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: 'newOwner', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const;
