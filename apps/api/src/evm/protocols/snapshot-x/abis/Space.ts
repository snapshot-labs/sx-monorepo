export default [
  {
    type: 'function',
    name: 'activeVotingStrategies',
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
    name: 'authenticators',
    inputs: [
      {
        name: 'auth',
        type: 'address',
        internalType: 'address'
      }
    ],
    outputs: [
      {
        name: 'allowed',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'cancel',
    inputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'daoURI',
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
    name: 'execute',
    inputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: 'executionPayload',
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
        name: 'proposalId',
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
    name: 'initialize',
    inputs: [
      {
        name: 'input',
        type: 'tuple',
        internalType: 'struct InitializeCalldata',
        components: [
          {
            name: 'owner',
            type: 'address',
            internalType: 'address'
          },
          {
            name: 'votingDelay',
            type: 'uint32',
            internalType: 'uint32'
          },
          {
            name: 'minVotingDuration',
            type: 'uint32',
            internalType: 'uint32'
          },
          {
            name: 'maxVotingDuration',
            type: 'uint32',
            internalType: 'uint32'
          },
          {
            name: 'proposalValidationStrategy',
            type: 'tuple',
            internalType: 'struct Strategy',
            components: [
              {
                name: 'addr',
                type: 'address',
                internalType: 'address'
              },
              {
                name: 'params',
                type: 'bytes',
                internalType: 'bytes'
              }
            ]
          },
          {
            name: 'proposalValidationStrategyMetadataURI',
            type: 'string',
            internalType: 'string'
          },
          {
            name: 'daoURI',
            type: 'string',
            internalType: 'string'
          },
          {
            name: 'metadataURI',
            type: 'string',
            internalType: 'string'
          },
          {
            name: 'votingStrategies',
            type: 'tuple[]',
            internalType: 'struct Strategy[]',
            components: [
              {
                name: 'addr',
                type: 'address',
                internalType: 'address'
              },
              {
                name: 'params',
                type: 'bytes',
                internalType: 'bytes'
              }
            ]
          },
          {
            name: 'votingStrategyMetadataURIs',
            type: 'string[]',
            internalType: 'string[]'
          },
          {
            name: 'authenticators',
            type: 'address[]',
            internalType: 'address[]'
          }
        ]
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'maxVotingDuration',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint32',
        internalType: 'uint32'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'minVotingDuration',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint32',
        internalType: 'uint32'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'nextProposalId',
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
    name: 'nextVotingStrategyIndex',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint8',
        internalType: 'uint8'
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
    name: 'proposalValidationStrategy',
    inputs: [],
    outputs: [
      {
        name: 'addr',
        type: 'address',
        internalType: 'address'
      },
      {
        name: 'params',
        type: 'bytes',
        internalType: 'bytes'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'proposals',
    inputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    outputs: [
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
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'propose',
    inputs: [
      {
        name: 'author',
        type: 'address',
        internalType: 'address'
      },
      {
        name: 'metadataURI',
        type: 'string',
        internalType: 'string'
      },
      {
        name: 'executionStrategy',
        type: 'tuple',
        internalType: 'struct Strategy',
        components: [
          {
            name: 'addr',
            type: 'address',
            internalType: 'address'
          },
          {
            name: 'params',
            type: 'bytes',
            internalType: 'bytes'
          }
        ]
      },
      {
        name: 'userProposalValidationParams',
        type: 'bytes',
        internalType: 'bytes'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'proxiableUUID',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'bytes32',
        internalType: 'bytes32'
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
    type: 'function',
    name: 'updateProposal',
    inputs: [
      {
        name: 'author',
        type: 'address',
        internalType: 'address'
      },
      {
        name: 'proposalId',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: 'executionStrategy',
        type: 'tuple',
        internalType: 'struct Strategy',
        components: [
          {
            name: 'addr',
            type: 'address',
            internalType: 'address'
          },
          {
            name: 'params',
            type: 'bytes',
            internalType: 'bytes'
          }
        ]
      },
      {
        name: 'metadataURI',
        type: 'string',
        internalType: 'string'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'updateSettings',
    inputs: [
      {
        name: 'input',
        type: 'tuple',
        internalType: 'struct UpdateSettingsCalldata',
        components: [
          {
            name: 'minVotingDuration',
            type: 'uint32',
            internalType: 'uint32'
          },
          {
            name: 'maxVotingDuration',
            type: 'uint32',
            internalType: 'uint32'
          },
          {
            name: 'votingDelay',
            type: 'uint32',
            internalType: 'uint32'
          },
          {
            name: 'metadataURI',
            type: 'string',
            internalType: 'string'
          },
          {
            name: 'daoURI',
            type: 'string',
            internalType: 'string'
          },
          {
            name: 'proposalValidationStrategy',
            type: 'tuple',
            internalType: 'struct Strategy',
            components: [
              {
                name: 'addr',
                type: 'address',
                internalType: 'address'
              },
              {
                name: 'params',
                type: 'bytes',
                internalType: 'bytes'
              }
            ]
          },
          {
            name: 'proposalValidationStrategyMetadataURI',
            type: 'string',
            internalType: 'string'
          },
          {
            name: 'authenticatorsToAdd',
            type: 'address[]',
            internalType: 'address[]'
          },
          {
            name: 'authenticatorsToRemove',
            type: 'address[]',
            internalType: 'address[]'
          },
          {
            name: 'votingStrategiesToAdd',
            type: 'tuple[]',
            internalType: 'struct Strategy[]',
            components: [
              {
                name: 'addr',
                type: 'address',
                internalType: 'address'
              },
              {
                name: 'params',
                type: 'bytes',
                internalType: 'bytes'
              }
            ]
          },
          {
            name: 'votingStrategyMetadataURIsToAdd',
            type: 'string[]',
            internalType: 'string[]'
          },
          {
            name: 'votingStrategiesToRemove',
            type: 'uint8[]',
            internalType: 'uint8[]'
          }
        ]
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'upgradeTo',
    inputs: [
      {
        name: 'newImplementation',
        type: 'address',
        internalType: 'address'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'upgradeToAndCall',
    inputs: [
      {
        name: 'newImplementation',
        type: 'address',
        internalType: 'address'
      },
      {
        name: 'data',
        type: 'bytes',
        internalType: 'bytes'
      }
    ],
    outputs: [],
    stateMutability: 'payable'
  },
  {
    type: 'function',
    name: 'vote',
    inputs: [
      {
        name: 'voter',
        type: 'address',
        internalType: 'address'
      },
      {
        name: 'proposalId',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: 'choice',
        type: 'uint8',
        internalType: 'enum Choice'
      },
      {
        name: 'userVotingStrategies',
        type: 'tuple[]',
        internalType: 'struct IndexedStrategy[]',
        components: [
          {
            name: 'index',
            type: 'uint8',
            internalType: 'uint8'
          },
          {
            name: 'params',
            type: 'bytes',
            internalType: 'bytes'
          }
        ]
      },
      {
        name: 'metadataURI',
        type: 'string',
        internalType: 'string'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'votePower',
    inputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: 'choice',
        type: 'uint8',
        internalType: 'enum Choice'
      }
    ],
    outputs: [
      {
        name: 'votePower',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'voteRegistry',
    inputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: 'voter',
        type: 'address',
        internalType: 'address'
      }
    ],
    outputs: [
      {
        name: 'hasVoted',
        type: 'uint256',
        internalType: 'uint256'
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
        type: 'uint32',
        internalType: 'uint32'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'votingStrategies',
    inputs: [
      {
        name: 'strategyIndex',
        type: 'uint8',
        internalType: 'uint8'
      }
    ],
    outputs: [
      {
        name: 'addr',
        type: 'address',
        internalType: 'address'
      },
      {
        name: 'params',
        type: 'bytes',
        internalType: 'bytes'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'event',
    name: 'AdminChanged',
    inputs: [
      {
        name: 'previousAdmin',
        type: 'address',
        indexed: false,
        internalType: 'address'
      },
      {
        name: 'newAdmin',
        type: 'address',
        indexed: false,
        internalType: 'address'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'AuthenticatorsAdded',
    inputs: [
      {
        name: 'newAuthenticators',
        type: 'address[]',
        indexed: false,
        internalType: 'address[]'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'AuthenticatorsRemoved',
    inputs: [
      {
        name: 'authenticators',
        type: 'address[]',
        indexed: false,
        internalType: 'address[]'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'BeaconUpgraded',
    inputs: [
      {
        name: 'beacon',
        type: 'address',
        indexed: true,
        internalType: 'address'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'DaoURIUpdated',
    inputs: [
      {
        name: 'newDaoURI',
        type: 'string',
        indexed: false,
        internalType: 'string'
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
    name: 'MaxVotingDurationUpdated',
    inputs: [
      {
        name: 'newMaxVotingDuration',
        type: 'uint32',
        indexed: false,
        internalType: 'uint32'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'MetadataURIUpdated',
    inputs: [
      {
        name: 'newMetadataURI',
        type: 'string',
        indexed: false,
        internalType: 'string'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'MinVotingDurationUpdated',
    inputs: [
      {
        name: 'newMinVotingDuration',
        type: 'uint32',
        indexed: false,
        internalType: 'uint32'
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
    name: 'ProposalCancelled',
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
        name: 'author',
        type: 'address',
        indexed: false,
        internalType: 'address'
      },
      {
        name: 'proposal',
        type: 'tuple',
        indexed: false,
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
        name: 'metadataUri',
        type: 'string',
        indexed: false,
        internalType: 'string'
      },
      {
        name: 'payload',
        type: 'bytes',
        indexed: false,
        internalType: 'bytes'
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
    name: 'ProposalUpdated',
    inputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256'
      },
      {
        name: 'newExecutionStrategy',
        type: 'tuple',
        indexed: false,
        internalType: 'struct Strategy',
        components: [
          {
            name: 'addr',
            type: 'address',
            internalType: 'address'
          },
          {
            name: 'params',
            type: 'bytes',
            internalType: 'bytes'
          }
        ]
      },
      {
        name: 'newMetadataURI',
        type: 'string',
        indexed: false,
        internalType: 'string'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'ProposalValidationStrategyUpdated',
    inputs: [
      {
        name: 'newProposalValidationStrategy',
        type: 'tuple',
        indexed: false,
        internalType: 'struct Strategy',
        components: [
          {
            name: 'addr',
            type: 'address',
            internalType: 'address'
          },
          {
            name: 'params',
            type: 'bytes',
            internalType: 'bytes'
          }
        ]
      },
      {
        name: 'newProposalValidationStrategyMetadataURI',
        type: 'string',
        indexed: false,
        internalType: 'string'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'SpaceCreated',
    inputs: [
      {
        name: 'space',
        type: 'address',
        indexed: false,
        internalType: 'address'
      },
      {
        name: 'input',
        type: 'tuple',
        indexed: false,
        internalType: 'struct InitializeCalldata',
        components: [
          {
            name: 'owner',
            type: 'address',
            internalType: 'address'
          },
          {
            name: 'votingDelay',
            type: 'uint32',
            internalType: 'uint32'
          },
          {
            name: 'minVotingDuration',
            type: 'uint32',
            internalType: 'uint32'
          },
          {
            name: 'maxVotingDuration',
            type: 'uint32',
            internalType: 'uint32'
          },
          {
            name: 'proposalValidationStrategy',
            type: 'tuple',
            internalType: 'struct Strategy',
            components: [
              {
                name: 'addr',
                type: 'address',
                internalType: 'address'
              },
              {
                name: 'params',
                type: 'bytes',
                internalType: 'bytes'
              }
            ]
          },
          {
            name: 'proposalValidationStrategyMetadataURI',
            type: 'string',
            internalType: 'string'
          },
          {
            name: 'daoURI',
            type: 'string',
            internalType: 'string'
          },
          {
            name: 'metadataURI',
            type: 'string',
            internalType: 'string'
          },
          {
            name: 'votingStrategies',
            type: 'tuple[]',
            internalType: 'struct Strategy[]',
            components: [
              {
                name: 'addr',
                type: 'address',
                internalType: 'address'
              },
              {
                name: 'params',
                type: 'bytes',
                internalType: 'bytes'
              }
            ]
          },
          {
            name: 'votingStrategyMetadataURIs',
            type: 'string[]',
            internalType: 'string[]'
          },
          {
            name: 'authenticators',
            type: 'address[]',
            internalType: 'address[]'
          }
        ]
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'Upgraded',
    inputs: [
      {
        name: 'implementation',
        type: 'address',
        indexed: true,
        internalType: 'address'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'VoteCast',
    inputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256'
      },
      {
        name: 'voter',
        type: 'address',
        indexed: false,
        internalType: 'address'
      },
      {
        name: 'choice',
        type: 'uint8',
        indexed: false,
        internalType: 'enum Choice'
      },
      {
        name: 'votingPower',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'VoteCastWithMetadata',
    inputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256'
      },
      {
        name: 'voter',
        type: 'address',
        indexed: false,
        internalType: 'address'
      },
      {
        name: 'choice',
        type: 'uint8',
        indexed: false,
        internalType: 'enum Choice'
      },
      {
        name: 'votingPower',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256'
      },
      {
        name: 'metadataUri',
        type: 'string',
        indexed: false,
        internalType: 'string'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'VotingDelayUpdated',
    inputs: [
      {
        name: 'newVotingDelay',
        type: 'uint32',
        indexed: false,
        internalType: 'uint32'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'VotingStrategiesAdded',
    inputs: [
      {
        name: 'newVotingStrategies',
        type: 'tuple[]',
        indexed: false,
        internalType: 'struct Strategy[]',
        components: [
          {
            name: 'addr',
            type: 'address',
            internalType: 'address'
          },
          {
            name: 'params',
            type: 'bytes',
            internalType: 'bytes'
          }
        ]
      },
      {
        name: 'newVotingStrategyMetadataURIs',
        type: 'string[]',
        indexed: false,
        internalType: 'string[]'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'VotingStrategiesRemoved',
    inputs: [
      {
        name: 'votingStrategyIndices',
        type: 'uint8[]',
        indexed: false,
        internalType: 'uint8[]'
      }
    ],
    anonymous: false
  },
  {
    type: 'error',
    name: 'ArrayLengthMismatch',
    inputs: []
  },
  {
    type: 'error',
    name: 'AuthenticatorNotWhitelisted',
    inputs: []
  },
  {
    type: 'error',
    name: 'DuplicateFound',
    inputs: [
      {
        name: 'index',
        type: 'uint8',
        internalType: 'uint8'
      }
    ]
  },
  {
    type: 'error',
    name: 'EmptyArray',
    inputs: []
  },
  {
    type: 'error',
    name: 'ExceedsStrategyLimit',
    inputs: []
  },
  {
    type: 'error',
    name: 'FailedToPassProposalValidation',
    inputs: []
  },
  {
    type: 'error',
    name: 'InvalidCaller',
    inputs: []
  },
  {
    type: 'error',
    name: 'InvalidDuration',
    inputs: [
      {
        name: 'minVotingDuration',
        type: 'uint32',
        internalType: 'uint32'
      },
      {
        name: 'maxVotingDuration',
        type: 'uint32',
        internalType: 'uint32'
      }
    ]
  },
  {
    type: 'error',
    name: 'InvalidPayload',
    inputs: []
  },
  {
    type: 'error',
    name: 'InvalidProposal',
    inputs: []
  },
  {
    type: 'error',
    name: 'InvalidStrategyIndex',
    inputs: [
      {
        name: 'index',
        type: 'uint256',
        internalType: 'uint256'
      }
    ]
  },
  {
    type: 'error',
    name: 'NoActiveVotingStrategies',
    inputs: []
  },
  {
    type: 'error',
    name: 'ProposalFinalized',
    inputs: []
  },
  {
    type: 'error',
    name: 'UserAlreadyVoted',
    inputs: []
  },
  {
    type: 'error',
    name: 'UserHasNoVotingPower',
    inputs: []
  },
  {
    type: 'error',
    name: 'VotingDelayHasPassed',
    inputs: []
  },
  {
    type: 'error',
    name: 'VotingPeriodHasEnded',
    inputs: []
  },
  {
    type: 'error',
    name: 'VotingPeriodHasNotStarted',
    inputs: []
  },
  {
    type: 'error',
    name: 'ZeroAddress',
    inputs: []
  }
] as const;
