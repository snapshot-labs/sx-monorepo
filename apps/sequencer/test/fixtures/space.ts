// Mock return results from SQL
export const spacesSqlFixtures: Record<string, any>[] = [
  {
    id: 'test.eth',
    name: 'Test Space',
    verified: 1,
    flagged: 0,
    deleted: 0,
    hibernated: 0,
    turbo: 0,
    created: 1649844547,
    updated: 1649844547,
    settings: {
      name: 'Test Space',
      admins: ['0xFC01614d28595d9ea5963daD9f44C0E0F0fE10f0'],
      symbol: 'TEST',
      network: '1',
      strategies: [{ name: 'basic' }]
    }
  },
  {
    id: 'test2.eth',
    name: 'Test Space 2',
    verified: 0,
    flagged: 0,
    deleted: 0,
    hibernated: 0,
    turbo: 0,
    created: 1649844547,
    updated: 1649844547,
    settings: {
      name: 'Test Space 2',
      admins: ['0x87D68ecFBcF53c857ABf494728Cf3DE1016b27B0'],
      symbol: 'TEST2',
      network: '1',
      strategies: [{ name: 'basic' }]
    }
  },
  {
    id: 'test-deleted.eth',
    name: 'Test deleted space',
    verified: 0,
    flagged: 0,
    deleted: 1,
    hibernated: 0,
    turbo: 0,
    created: 1649844547,
    updated: 1649844547,
    settings: {
      name: 'Test deleted space',
      admins: ['0x87D68ecFBcF53c857ABf494728Cf3DE1016b27B0'],
      symbol: 'TEST2',
      network: '1',
      strategies: [{ name: 'basic' }]
    }
  }
];

export const spacesGetSpaceFixtures: Record<string, any> = {
  name: 'Fabien',
  skin: 'eth',
  about: 'This is nothing more than a test space.',
  admins: [
    '0xef8305e140ac520225daf050e2f71d5fbcc543e7',
    '0x4c7909d6f029b3a5798143c843f4f8e5341a3473',
    '0x556b14cbda79a36dc33fcd461a04a5bcb5dc2a70'
  ],
  avatar: 'ipfs://bafkreiebuwngipaevu4gsdkyk44vnkezzahn7rsbreessbryrgqcf5meim',
  github: 'bonustrack',
  symbol: 'POINT',
  voting: {},
  filters: {},
  members: [],
  network: '1',
  plugins: {},
  private: false,
  twitter: 'bonustrack87',
  website: 'https://snapshot.org/#/fabien.eth',
  children: [],
  categories: ['social', 'creator'],
  moderators: ['0xe029ef62e47e394bc852eff633eb5aa4a223eca6'],
  strategies: [
    {
      name: 'whitelist',
      params: {
        symbol: 'POINT',
        addresses: [
          '0xa478c2975ab1ea89e8196811f51a7b7ade33eb11',
          '0xeF8305E140ac520225DAf050e2f71d5fBcC543e7',
          '0x1B5D05c10bdeE94FAcfB8a5C1711DA8e9313FD2a'
        ]
      },
      network: '1'
    }
  ],
  treasuries: [],
  validation: {
    name: 'basic',
    params: {
      minScore: 0,
      strategies: [
        {
          name: 'eth-balance',
          params: {
            symbol: 'ETH'
          },
          network: '1'
        }
      ]
    }
  },
  voteValidation: {
    name: 'any',
    params: {}
  },
  flagged: 0,
  verified: 0,
  hibernated: 0,
  turbo: 0
};
