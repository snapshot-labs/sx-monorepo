export const snackFactoryAbi = [
  {
    type: 'event',
    name: 'MarketCreated',
    inputs: [
      {
        name: 'referenceId',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32'
      },
      {
        name: 'referenceUri',
        type: 'string',
        indexed: false,
        internalType: 'string'
      },
      {
        name: 'market',
        type: 'address',
        indexed: false,
        internalType: 'address'
      }
    ]
  },
  {
    type: 'function',
    name: 'getMarketById',
    inputs: [{ name: 'refId', type: 'bytes32', internalType: 'bytes32' }],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view'
  }
] as const;

export const snackMarketAbi = [
  {
    type: 'function',
    name: 'resolved',
    inputs: [],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'referenceUri',
    inputs: [],
    outputs: [{ name: '', type: 'string', internalType: 'string' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'resolve',
    inputs: [
      {
        name: '_winningOutcome',
        type: 'uint8',
        internalType: 'uint8'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  }
] as const;
