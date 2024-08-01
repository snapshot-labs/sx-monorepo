// contract addresses pulled from https://github.com/UMAprotocol/protocol/tree/master/packages/core/networks
export const contractData = [
  {
    // mainnet
    network: '1',
    name: 'OptimisticOracleV3',
    address: '0xfb55F43fB9F48F63f9269DB7Dde3BbBe1ebDC0dE',
    subgraph:
      'https://subgrapher.snapshot.org/subgraph/arbitrum/Bm3ytsa1YvcyFJahdfQQgscFQVCcMvoXujzkd3Cz6aof',
    deployBlock: 16636058
  },
  {
    // goerli
    network: '5',
    name: 'OptimisticOracleV3',
    address: '0x9923D42eF695B5dd9911D05Ac944d4cAca3c4EAB',
    subgraph:
      'https://api.thegraph.com/subgraphs/name/md0x/goerli-optimistic-oracle-v3',
    deployBlock: 8497481
  },
  {
    // optimism
    network: '10',
    name: 'OptimisticOracleV3',
    address: '0x072819Bb43B50E7A251c64411e7aA362ce82803B',
    subgraph:
      'https://subgrapher.snapshot.org/subgraph/arbitrum/FyJQyV5TLNeowZrL6kLUTB9JNPyWQNCNXJoxJWGEtBcn',
    deployBlock: 74537234
  },
  {
    // gnosis
    network: '100',
    name: 'OptimisticOracleV3',
    address: '0x22A9AaAC9c3184f68C7B7C95b1300C4B1D2fB95C',
    subgraph:
      'https://subgrapher.snapshot.org/subgraph/arbitrum/9K2nctaB2rAh7Cgzx3wKtdHwWoEeEQ9AThGATak6Ngm9',
    deployBlock: 27087150
  },
  {
    // polygon
    network: '137',
    name: 'OptimisticOracleV3',
    address: '0x5953f2538F613E05bAED8A5AeFa8e6622467AD3D',
    subgraph:
      'https://subgrapher.snapshot.org/subgraph/arbitrum/7KWbDhUE5Eqcfn3LXQtLbCfJLkNucnhzJLpi2jKhqNuf',
    deployBlock: 39331673
  },
  {
    //arbitrum
    network: '42161',
    name: 'OptimisticOracleV3',
    address: '0xa6147867264374F324524E30C02C331cF28aa879',
    subgraph:
      'https://subgrapher.snapshot.org/subgraph/arbitrum/9wpkM5tHgJBHYTzKEKk4tK8a7q6MimfS9QnW7Japa8hW',
    deployBlock: 61236565
  },
  {
    // avalanche
    network: '43114',
    name: 'OptimisticOracleV3',
    address: '0xa4199d73ae206d49c966cF16c58436851f87d47F',
    subgraph:
      'https://subgrapher.snapshot.org/subgraph/arbitrum/3k8gzGzTMV2vDZAGBFM2q642SUyVbE31bAUL8SjFQkre',
    deployBlock: 27816737
  },
  {
    // core
    network: '1116',
    name: 'OptimisticOracleV3',
    address: '0xD84ACa67d683aF7702705141b3C7E57e4e5e7726',
    subgraph:
      'https://thegraph.coredao.org/subgraphs/name/umaprotocol/core-optimistic-oracle-v3',
    deployBlock: 11341063
  },
  {
    // base
    network: '8453',
    name: 'OptimisticOracleV3',
    address: '0x2aBf1Bd76655de80eDB3086114315Eec75AF500c',
    subgraph:
      'https://subgrapher.snapshot.org/subgraph/arbitrum/2Q4i8YgVZd6bAmLyDxXgrKPL2B6QwySiEUqbTyQ4vm4C',
    deployBlock: 12066343
  },
  {
    // sepolia
    network: '11155111',
    name: 'OptimisticOracleV3',
    address: '0xFd9e2642a170aDD10F53Ee14a93FcF2F31924944',
    subgraph:
      'https://subgrapher.snapshot.org/subgraph/arbitrum/78JbrMhcC9CVDZHDADvNcyhRrrccTJG4vCVBztyer1Xa',
    deployBlock: 5421195
  },
  {
    // mainnet
    network: '1',
    name: 'OptimisticGovernor',
    address: '0x28CeBFE94a03DbCA9d17143e9d2Bd1155DC26D5d',
    subgraph:
      'https://subgrapher.snapshot.org/subgraph/arbitrum/DQpwhiRSPQJEuc8y6ZBGsFfNpfwFQ8NjmjLmfv8kBkLu',
    deployBlock: 16890621
  },
  // Keep in mind, OG addresses are not the module addresses for each individual space, these addresses typically
  // are not used, but are here for reference.
  {
    //goerli
    network: '5',
    name: 'OptimisticGovernor',
    address: '0x07a7Be7AA4AaD42696A17e974486cb64A4daC47b',
    deployBlock: 8700589,
    subgraph:
      'https://api.thegraph.com/subgraphs/name/md0x/goerli-optimistic-governor'
  },
  {
    // optimism
    network: '10',
    name: 'OptimisticGovernor',
    address: '0x357fe84E438B3150d2F68AB9167bdb8f881f3b9A',
    deployBlock: 83168480,
    subgraph:
      'https://subgrapher.snapshot.org/subgraph/arbitrum/Fd5RvSfkajAJ8Mi9sPxFSMVPFf56SDivDQW3ocqTAW5'
  },
  {
    // gnosis
    network: '100',
    name: 'OptimisticGovernor',
    deployBlock: 27102135,
    subgraph:
      'https://subgrapher.snapshot.org/subgraph/arbitrum/RrkjZ6wTgLJkcjX68auzrEZHMRYwDx8kR5sFQQy4Phz'
  },
  {
    // polygon
    network: '137',
    name: 'OptimisticGovernor',
    address: '0x3Cc4b597E9c3f51288c6Cd0c087DC14c3FfdD966',
    deployBlock: 40677035,
    subgraph:
      'https://subgrapher.snapshot.org/subgraph/arbitrum/7L2JM14PnZgxGnRX7xaz54zWS6KVK6ZqVRCxEKJrJTDG'
  },
  {
    // arbitrum
    network: '42161',
    name: 'OptimisticGovernor',
    address: '0x30679ca4ea452d3df8a6c255a806e08810321763',
    deployBlock: 72850751,
    subgraph:
      'https://subgrapher.snapshot.org/subgraph/arbitrum/BfK867bnkQhnx1LspA99ypqiqxbAReQ92aZz66Ubv4tz'
  },
  {
    // avalanche
    network: '43114',
    name: 'OptimisticGovernor',
    address: '0xEF8b46765ae805537053C59f826C3aD61924Db45',
    deployBlock: 28050250,
    subgraph:
      'https://subgrapher.snapshot.org/subgraph/arbitrum/5F8875fmvtnv8Vv4aeedUcwNWjuxUg54aTHdapFuMJi3'
  },
  {
    // core
    network: '1116',
    name: 'OptimisticGovernor',
    address: '0x596Fd6A5A185c67aBD1c845b39f593fBA9C233aa',
    deployBlock: 11341122,
    subgraph:
      'https://thegraph.coredao.org/subgraphs/name/umaprotocol/core-optimistic-governor'
  },
  {
    // base
    network: '8453',
    name: 'OptimisticGovernor',
    address: '0x80bCA2E1c272239AdFDCdc87779BC8Af6E12e633',
    deployBlock: 13062540,
    subgraph:
      'https://subgrapher.snapshot.org/subgraph/arbitrum/H1WyWZqh5pHebWRDCXs7GhvGj7XznSP7arPY6pYcCqLn'
  },
  {
    // sepolia
    network: '11155111',
    name: 'OptimisticGovernor',
    address: '0x40153DdFAd90C49dbE3F5c9F96f2a5B25ec67461',
    deployBlock: 5421242,
    subgraph:
      'https://subgrapher.snapshot.org/subgraph/arbitrum/5pwrjCkpcpCd79k9MBS5yVgnsHQiw6afvXUfzqHjdRFw'
  }
] as const;
