export default [
  {
    inputs: [
      { internalType: 'address', name: '_implementation', type: 'address' }
    ],
    stateMutability: 'nonpayable',
    type: 'constructor'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'contractAddress',
        type: 'address'
      }
    ],
    name: 'ContractDeployed',
    type: 'event'
  },
  {
    inputs: [
      { internalType: 'address', name: '_owner', type: 'address' },
      { internalType: 'address', name: '_target', type: 'address' },
      { internalType: 'address', name: '_starknetCore', type: 'address' },
      { internalType: 'uint256', name: '_executionRelayer', type: 'uint256' },
      { internalType: 'uint256[]', name: '_starknetSpaces', type: 'uint256[]' },
      { internalType: 'uint256', name: '_quorum', type: 'uint256' },
      { internalType: 'bytes32', name: 'salt', type: 'bytes32' }
    ],
    name: 'createContract',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'deployedContracts',
    outputs: [
      {
        internalType: 'contract L1AvatarExecutionStrategy',
        name: '',
        type: 'address'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'implementation',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;
