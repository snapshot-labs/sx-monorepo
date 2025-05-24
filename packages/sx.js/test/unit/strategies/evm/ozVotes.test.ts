import { JsonRpcProvider } from '@ethersproject/providers';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import createOzVotesStrategy from '../../../../src/strategies/evm/ozVotes';

describe('ozVotes', () => {
  const ozVotesStrategy = createOzVotesStrategy();

  const provider = new JsonRpcProvider('https://rpc.brovider.xyz/11155111');
  const params = '0xFA60565Aa8Ce3dA049fE1B0b93640534eae84287';

  beforeAll(() => {
    vi.mock('@ethersproject/contracts', () => ({
      Contract: class {
        async getVotes(
          voterAddress: string,
          { blockTag }: { blockTag: number | string }
        ) {
          if (
            voterAddress === '0xa40839f84cf98ee6f4fdb84c1bb1a448e7835efe' &&
            blockTag === 8388733
          ) {
            return '1000000000000000000';
          }

          if (
            voterAddress === '0x000000000000000000000000000000000000dead' &&
            blockTag === 8388733
          ) {
            return '0';
          }

          if (
            voterAddress === '0xa40839f84cf98ee6f4fdb84c1bb1a448e7835efe' &&
            blockTag === 'latest'
          ) {
            return '3000000000000000000';
          }

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
        '0xa40839f84cf98ee6f4fdb84c1bb1a448e7835efe',
        null,
        8388733,
        params,
        provider
      );

      expect(votingPower.toString()).toEqual('1000000000000000000');
    });

    it('should compute voting power for user without delegated tokens', async () => {
      const votingPower = await ozVotesStrategy.getVotingPower(
        '0x2c8631584474E750CEdF2Fb6A904f2e84777Aefe',
        '0x000000000000000000000000000000000000dead',
        null,
        8388733,
        params,
        provider
      );

      expect(votingPower.toString()).toEqual('0');
    });

    it('should compute voting power for user with delegated tokens at null block', async () => {
      const votingPower = await ozVotesStrategy.getVotingPower(
        '0x2c8631584474E750CEdF2Fb6A904f2e84777Aefe',
        '0xa40839f84cf98ee6f4fdb84c1bb1a448e7835efe',
        null,
        null,
        params,
        provider
      );

      expect(votingPower.toString()).toEqual('3000000000000000000');
    });
  });
});
