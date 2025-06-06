import { JsonRpcProvider } from '@ethersproject/providers';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import createCompStrategy from '../../../../src/strategies/evm/comp';

describe('compStrategy', () => {
  const compStrategy = createCompStrategy();

  const provider = new JsonRpcProvider('https://rpc.brovider.xyz/11155111');
  const params = '0x6Fd821e79cDf212aD8b06C59B28FE8C2185291d4';

  beforeAll(() => {
    vi.mock('@ethersproject/contracts', () => ({
      Contract: class {
        async getCurrentVotes(
          voterAddress: string,
          { blockTag }: { blockTag: number | string }
        ) {
          if (
            voterAddress === '0xa40839f84cf98ee6f4fdb84c1bb1a448e7835efe' &&
            blockTag === 8388714
          ) {
            return '150000000';
          }

          if (
            voterAddress === '0x000000000000000000000000000000000000dead' &&
            blockTag === 8388714
          ) {
            return '0';
          }

          if (
            voterAddress === '0xa40839f84cf98ee6f4fdb84c1bb1a448e7835efe' &&
            blockTag === 'latest'
          ) {
            return '300000000';
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
    expect(compStrategy.type).toBe('comp');
  });

  describe('getVotingPower', () => {
    it('should compute voting power for user with delegated tokens at specific timestamp', async () => {
      const votingPower = await compStrategy.getVotingPower(
        '0x0c2De612982Efd102803161fc7C74CcA15Db932c',
        '0xa40839f84cf98ee6f4fdb84c1bb1a448e7835efe',
        null,
        8388714,
        params,
        provider
      );

      expect(votingPower.toString()).toEqual('150000000');
    });

    it('should compute voting power for user without delegated tokens', async () => {
      const votingPower = await compStrategy.getVotingPower(
        '0x0c2De612982Efd102803161fc7C74CcA15Db932c',
        '0x000000000000000000000000000000000000dead',
        null,
        8388714,
        params,
        provider
      );

      expect(votingPower.toString()).toEqual('0');
    });

    it('should compute voting power for user with delegated tokens at null block', async () => {
      const votingPower = await compStrategy.getVotingPower(
        '0x0c2De612982Efd102803161fc7C74CcA15Db932c',
        '0xa40839f84cf98ee6f4fdb84c1bb1a448e7835efe',
        null,
        null,
        params,
        provider
      );

      expect(votingPower.toString()).toEqual('300000000');
    });
  });
});
