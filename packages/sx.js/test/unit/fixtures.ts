import { Envelope, Propose, Vote } from '../../src/clients/starknet/types';

const proposeData = {
  space: '0x07e6e9047eb910f84f7e3b86cea7b1d7779c109c970a39b54379c1f4fa395b28',
  authenticator:
    '0x064cce9272197eba6353f5bbf060e097e516b411e66e83a9cf5910a08697df14',
  strategies: [
    {
      index: 1,
      address:
        '0x0277bc9bb7b7e7f48faaf5a2023f247e5c7cd81bfab1221bd7e91c9d4894ec1a',
      params: '0x'
    }
  ],
  executionStrategy: {
    addr: '0x04ecc83848a519cc22b0d0ffb70e65ec8dde85d3d13439eff7145d4063cf6b4d',
    params: ['0x00']
  },
  metadataUri: 'ipfs://QmNrm6xKuib1THtWkiN5CKtBEerQCDpUtmgDqiaU2xDmca'
};

const voteData = {
  space: '0x07e6e9047eb910f84f7e3b86cea7b1d7779c109c970a39b54379c1f4fa395b28',
  authenticator:
    '0x064cce9272197eba6353f5bbf060e097e516b411e66e83a9cf5910a08697df14',
  strategies: [
    {
      index: 1,
      address:
        '0x0277bc9bb7b7e7f48faaf5a2023f247e5c7cd81bfab1221bd7e91c9d4894ec1a',
      params: '0x'
    }
  ],
  metadataUri: '',
  proposal: 3,
  choice: 1
};

export const proposeEnvelope: Envelope<Propose> = {
  signatureData: {
    address: '0x0538D033B879aC94C709c1E408CC081345427379',
    message: {
      salt: '0x0'
    },
    signature: ['21', '42']
  },
  data: proposeData
};

export const voteEnvelope: Envelope<Vote> = {
  signatureData: {
    address: '0x0538D033B879aC94C709c1E408CC081345427379',
    message: {
      salt: '0x0'
    },
    signature: ['21', '42']
  },
  data: voteData
};

export const proposeEthSigEnvelope: Envelope<Propose> = {
  signatureData: {
    address: '0x0538D033B879aC94C709c1E408CC081345427379',
    message: {
      salt: '0x0'
    },
    signature: ['21', '42', '1337']
  },
  data: proposeData
};

export const voteEthSigEnvelope: Envelope<Vote> = {
  signatureData: {
    address: '0x0538D033B879aC94C709c1E408CC081345427379',
    message: {
      salt: '0x0'
    },
    signature: ['21', '42', '1337']
  },
  data: voteData
};
