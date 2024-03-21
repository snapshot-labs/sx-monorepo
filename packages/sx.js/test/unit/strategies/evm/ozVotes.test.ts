import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { JsonRpcProvider } from '@ethersproject/providers';
import createOzVotesStrategy from '../../../../src/strategies/evm/ozVotes';

describe('ozVotes', () => {
  const ozVotesStrategy = createOzVotesStrategy();

  const provider = new JsonRpcProvider('https://rpc.brovider.xyz/11155111');
  const params = '0xFA60565Aa8Ce3dA049fE1B0b93640534eae84287';

  beforeAll(() => {
    vi.mock('@ethersproject/contracts', () => ({
      Contract: class {
        async getVotes(voterAddress: string) {
          if (voterAddress === '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70') return '10000021';
          return '0';
        }
      }
    }));
  });

  afterAll(() => {
    vi.resetAllMocks();
  });

  it('should return type', () => {
    expect(ozVotesStrategy.type).toBe('ozVotes');
  });

  describe('getVotingPower', () => {
    it('should compute voting power for user with delegated tokens at specific timestamp', async () => {
      const votingPower = await ozVotesStrategy.getVotingPower(
        '0x2c8631584474E750CEdF2Fb6A904f2e84777Aefe',
        '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
        null,
        9343895,
        params,
        provider
      );

      expect(votingPower.toString()).toEqual('10000021');
    });

    it('should compute voting power for user without delegated tokens', async () => {
      const votingPower = await ozVotesStrategy.getVotingPower(
        '0x2c8631584474E750CEdF2Fb6A904f2e84777Aefe',
        '0x000000000000000000000000000000000000dead',
        null,
        9343895,
        params,
        provider
      );

      expect(votingPower.toString()).toEqual('0');
    });
  });
});
