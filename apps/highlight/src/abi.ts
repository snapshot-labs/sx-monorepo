export const PosterAbi = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'user',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'content',
        type: 'string'
      },
      {
        indexed: true,
        internalType: 'string',
        name: 'tag',
        type: 'string'
      }
    ],
    name: 'NewPost',
    type: 'event'
  }
] as const;
