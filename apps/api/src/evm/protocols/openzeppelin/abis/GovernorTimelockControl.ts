export default [
  {
    type: 'function',
    name: 'timelock',
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
    name: 'updateTimelock',
    inputs: [
      {
        name: 'newTimelock',
        type: 'address',
        internalType: 'contract TimelockController'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
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
