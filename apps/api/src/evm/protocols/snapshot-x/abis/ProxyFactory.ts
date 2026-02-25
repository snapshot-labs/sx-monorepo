export default [
  {
    type: 'function',
    name: 'deployProxy',
    inputs: [
      {
        name: 'implementation',
        type: 'address',
        internalType: 'address'
      },
      {
        name: 'initializer',
        type: 'bytes',
        internalType: 'bytes'
      },
      {
        name: 'saltNonce',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'predictProxyAddress',
    inputs: [
      {
        name: 'implementation',
        type: 'address',
        internalType: 'address'
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
    stateMutability: 'view'
  },
  {
    type: 'event',
    name: 'ProxyDeployed',
    inputs: [
      {
        name: 'implementation',
        type: 'address',
        indexed: false,
        internalType: 'address'
      },
      {
        name: 'proxy',
        type: 'address',
        indexed: false,
        internalType: 'address'
      }
    ],
    anonymous: false
  },
  {
    type: 'error',
    name: 'FailedInitialization',
    inputs: []
  },
  {
    type: 'error',
    name: 'InvalidImplementation',
    inputs: []
  },
  {
    type: 'error',
    name: 'SaltAlreadyUsed',
    inputs: []
  }
] as const;
