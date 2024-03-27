import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { JsonRpcProvider } from '@ethersproject/providers';
import createCompStrategy from '../../../../src/strategies/evm/comp';

describe('compStrategy', () => {
  const compStrategy = createCompStrategy();

  const provider = new JsonRpcProvider('https://rpc.brovider.xyz/11155111');
  const params = '0x6Fd821e79cDf212aD8b06C59B28FE8C2185291d4';

  beforeAll(() => {
    vi.mock('@ethersproject/contracts', () => ({
      Contract: class {
        async getCurrentVotes(voterAddress: string) {
          if (voterAddress === '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70') {
            return '440540570656796043262';
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
        '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
        null,
        9343895,
        params,
        provider
      );

      expect(votingPower.toString()).toEqual('440540570656796043262');
    });

    it('should compute voting power for user without delegated tokens', async () => {
      const votingPower = await compStrategy.getVotingPower(
        '0x0c2De612982Efd102803161fc7C74CcA15Db932c',
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
