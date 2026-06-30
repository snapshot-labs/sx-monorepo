export default [
  {
    type: 'function',
    name: 'createContract',
    inputs: [
      {
        name: 'implementation',
        type: 'address',
        internalType: 'address'
      },
      {
        name: 'initializationData',
        type: 'bytes',
        internalType: 'bytes'
      },
      {
        name: 'salt',
        type: 'bytes32',
        internalType: 'bytes32'
      }
    ],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'address'
      }
    ],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'deployedContracts',
    inputs: [
      {
        name: '',
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
    type: 'event',
    name: 'ContractDeployed',
    inputs: [
      {
        name: 'implementation',
        type: 'address',
        indexed: false,
        internalType: 'address'
      },
      {
        name: 'contractAddress',
        type: 'address',
        indexed: false,
        internalType: 'address'
      }
    ],
    anonymous: false
  },
  {
    type: 'error',
    name: 'ERC1167FailedCreateClone',
    inputs: []
  }
] as const;
