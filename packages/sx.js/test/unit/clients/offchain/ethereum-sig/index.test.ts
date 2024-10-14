import { Wallet } from '@ethersproject/wallet';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { EthereumSig } from '../../../../../src/clients/offchain/ethereum-sig';
import { offchainGoerli } from '../../../../../src/offchainNetworks';

describe('EthereumSig', () => {
  // Test address: 0xf1f09AdC06aAB740AA16004D62Dbd89484d3Be90
  const TEST_PK =
    'ef4bcf36b5d026b703b86a311031fe2291b979620f01443f795fa213f9105e35';
  const signer = new Wallet(TEST_PK);
  const client = new EthereumSig({ networkConfig: offchainGoerli });

  beforeAll(() => {
    vi.useFakeTimers({
      now: new Date('2024-01-21').getTime()
    });
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('should create vote envelope', async () => {
    const payload = {
      space: 'wan-test.eth',
      authenticator: '',
      strategies: [],
      proposal:
        '0xcc47146e5e0ac781e8976405a8da4468f2a0c4cdf0c7659353d728fafe46f801',
      choice: 1,
      metadataUri: '',
      type: 'basic'
    };

    const envelope = await client.vote({
      signer,
      data: payload
    });

    expect(envelope).toMatchSnapshot();
  });

  it('should create propose envelope', async () => {
    const payload = {
      space: 'wan-test.eth',
      title: 'Creation test',
      body: 'Dummy body',
      type: 'basic',
      discussion: 'https://snapshot.org',
      choices: ['For', 'Against', 'Abstain'],
      labels: ['1234e'],
      start: Math.floor(Date.now() / 1000),
      end: Math.floor(Date.now() / 1000) + 60 * 60,
      snapshot: 19283932,
      plugins: '{}',
      app: 'snapshot-v2'
    };

    const envelope = await client.propose({
      signer,
      data: payload
    });

    expect(envelope).toMatchSnapshot();
  });

  it('should create cancelProposal envelope', async () => {
    const payload = {
      space: 'test.eth',
      proposal:
        '0x56b857b02d573b0ba747333b57cb3dd11df57cc0d1bcc41c3c990466b477c5e8'
    };

    const envelope = await client.cancel({
      signer,
      data: payload
    });

    expect(envelope).toMatchSnapshot();
  });
});
