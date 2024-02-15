import { Wallet } from '@ethersproject/wallet';
import { EthereumSig } from '../../../../../src/clients/offchain/ethereum-sig';
import { offchainGoerli } from '../../../../../src/offchainNetworks';
import { voteTypes, domain } from '../../../../../src/clients/offchain/ethereum-sig/types';

describe('EthereumSig', () => {
  // Test address: 0xf1f09AdC06aAB740AA16004D62Dbd89484d3Be90
  const TEST_PK = 'ef4bcf36b5d026b703b86a311031fe2291b979620f01443f795fa213f9105e35';
  const signer = new Wallet(TEST_PK);
  const client = new EthereumSig({ networkConfig: offchainGoerli });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should create vote envelope', async () => {
    const payload = {
      space: 'wan-test.eth',
      authenticator: '',
      strategies: [],
      proposal: '0xcc47146e5e0ac781e8976405a8da4468f2a0c4cdf0c7659353d728fafe46f801',
      choice: 1,
      metadataUri: ''
    };
    const address = await signer.getAddress();

    const envelope = await client.vote({
      signer,
      data: payload
    });

    expect(envelope).toEqual({
      data: payload,
      signatureData: {
        signature: expect.any(String),
        address,
        types: voteTypes,
        domain,
        message: {
          app: '',
          choice: payload.choice,
          from: address,
          metadata: '',
          proposal: payload.proposal,
          reason: '',
          space: payload.space,
          timestamp: expect.any(Number)
        }
      }
    });
  });
});
