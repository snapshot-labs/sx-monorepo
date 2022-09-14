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
      space: '0x0375bc9b4d236f961cbc5410213cdbf2de6dfe30f21b2c58bb4de3713d868383',
      authenticator: '0x4bbd4959806784f2ad7541e36eda88d9b3dff1baef60b39862abc171f3eed38',
      strategies: [0],
      executor: '0x6b429254760eea72cedb8e6485ebf090ced630a366012994296ceb253b42aeb',
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
      space: '0x0375bc9b4d236f961cbc5410213cdbf2de6dfe30f21b2c58bb4de3713d868383',
      authenticator: '0x4bbd4959806784f2ad7541e36eda88d9b3dff1baef60b39862abc171f3eed38',
      executor: '0x6b429254760eea72cedb8e6485ebf090ced630a366012994296ceb253b42aeb',
      strategies: [0],
      proposal: 1,
      choice: 1
    }
  }
};
