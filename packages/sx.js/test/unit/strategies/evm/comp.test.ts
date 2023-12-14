import { JsonRpcProvider } from '@ethersproject/providers';
import createCompStrategy from '../../../../src/strategies/evm/comp';

describe('compStrategy', () => {
  const compStrategy = createCompStrategy();

  const provider = new JsonRpcProvider('https://rpc.brovider.xyz/5');
  const params = '0x3587b2f7e0e2d6166d6c14230e7fe160252b0ba4';

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
