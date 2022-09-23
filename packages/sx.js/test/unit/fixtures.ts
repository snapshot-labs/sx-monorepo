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
      space: '0x4b7cff71219e275676e0ca23579f41b99dd1d1bd01adc7d7f1bc917d448e57d',
      authenticator: '0x6aac1e90da5df37bd59ac52b638a22de15231cbb78353b121df987873d0f369',
      strategies: [0],
      executor: '0x70d94f64cfab000f8e26318f4413dfdaa1f19a3695e3222297edc62bbc936c7',
      metadataUri: 'ipfs://QmNrm6xKuib1THtWkiN5CKtBEerQCDpUtmgDqiaU2xDmca',
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
      space: '0x4b7cff71219e275676e0ca23579f41b99dd1d1bd01adc7d7f1bc917d448e57d',
      authenticator: '0x6aac1e90da5df37bd59ac52b638a22de15231cbb78353b121df987873d0f369',
      executor: '0x70d94f64cfab000f8e26318f4413dfdaa1f19a3695e3222297edc62bbc936c7',
      strategies: [0],
      proposal: 1,
      choice: 1
    }
  }
};
