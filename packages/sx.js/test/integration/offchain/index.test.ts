import { describe, it, expect } from 'vitest';
import { Wallet } from '@ethersproject/wallet';
import { EthereumSig } from '../../../src/clients/offchain/ethereum-sig';
import { offchainGoerli } from '../../../src/offchainNetworks';
import vote from './fixtures/vote.json';
import proposal from './fixtures/proposal.json';

// Test address: 0xf1f09AdC06aAB740AA16004D62Dbd89484d3Be90
// This address only have the vote permissions on the testnet space wan-test.eth
const TEST_PK = 'ef4bcf36b5d026b703b86a311031fe2291b979620f01443f795fa213f9105e35';
const signer = new Wallet(TEST_PK);
const client = new EthereumSig({ networkConfig: offchainGoerli });

describe('vote', () => {
  it('should cast a vote', async () => {
    const envelope = await client.vote({
      signer,
      data: vote
    });

    return expect(client.send(envelope)).resolves.toHaveProperty('id');
  });

  it('should thrown an error when proposal is invalid', async () => {
    const envelope = await client.vote({
      signer,
      data: { ...vote, proposal: 'unknown-proposal' }
    });

    return expect(client.send(envelope)).rejects.toThrowError(/unknown proposal/);
  });
});

describe('propose', () => {
  it('should thrown an error when user can not create proposals', async () => {
    const currentTime = Math.floor(Date.now() / 1e3);
    const envelope = await client.propose({
      signer,
      data: { ...proposal, start: currentTime, end: currentTime + 60 }
    });

    return expect(client.send(envelope)).rejects.toThrowError(/validation failed/);
  });
});

describe('cancel', () => {
  it('should thrown an error when user does not have permission', async () => {
    const envelope = await client.cancel({
      signer,
      data: {
        space: 'fabien.eth',
        proposal: '0x0d68ee21b493aec521a67dbec244d131e00cfa5eb6f97c9a0133d3e3f08cd7d4'
      }
    });

    return expect(client.send(envelope)).rejects.toThrowError(/not authorized/);
  });
});
