export const proposeEnvelope = {
  address: '0x0BF8dE8Fc51002c9fE7cb29352dcaCb757d0364b',
  sig: '0x9477b6bae1534ea017fc44d8df019dcd74c87146c9ec0e37400019d3b5e7330010f89f8c80474f42f7d9a125156e8dc26a24d54eb1b496f88f04c467a9574f211c',
  data: {
    domain: { name: 'snapshot-x', version: '1' },
    types: {
      Propose: [
        { name: 'space', type: 'bytes32' },
        { name: 'executionHash', type: 'bytes32' },
        { name: 'metadataURI', type: 'string' },
        { name: 'salt', type: 'uint256' }
      ]
    },
    message: {
      space: '0x069555971fbf76b3d0471297818ed93986fdd7afe3816d53ea8d8e72034260d8',
      authenticator: '0x594a81b66c3aa2c64577916f727e1307b60c9d6afa80b6f5ca3e3049c40f643',
      strategies: ['0x4bbd8081b1e9ef84ee2a767ef2cdcdea0dd8298b8e2858afa06bed1898533e6'],
      metadataURI: 'ipfs://QmNrm6xKuib1THtWkiN5CKtBEerQCDpUtmgDqiaU2xDmca',
      executionParams: [],
      executionHash: '0x049ee3eba8c1600700ee1b87eb599f16716b0b1022947733551fde4050ca6804',
      salt: 2817056238
    }
  }
};

export const voteEnvelope = {
  address: '0x0BF8dE8Fc51002c9fE7cb29352dcaCb757d0364b',
  sig: '0x9477b6bae1534ea017fc44d8df019dcd74c87146c9ec0e37400019d3b5e7330010f89f8c80474f42f7d9a125156e8dc26a24d54eb1b496f88f04c467a9574f211c',
  data: {
    domain: { name: 'snapshot-x', version: '1' },
    types: {
      Propose: [
        { name: 'space', type: 'bytes32' },
        { name: 'executionHash', type: 'bytes32' },
        { name: 'metadataURI', type: 'string' },
        { name: 'salt', type: 'uint256' }
      ]
    },
    message: {
      space: '0x069555971fbf76b3d0471297818ed93986fdd7afe3816d53ea8d8e72034260d8',
      authenticator: '0x594a81b66c3aa2c64577916f727e1307b60c9d6afa80b6f5ca3e3049c40f643',
      strategies: ['0x4bbd8081b1e9ef84ee2a767ef2cdcdea0dd8298b8e2858afa06bed1898533e6'],
      proposal: 9,
      choice: 1
    }
  }
};
