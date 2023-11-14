import { JsonRpcProvider } from '@ethersproject/providers';
import createVanillaStrategy from '../../../../src/strategies/evm/vanilla';

describe('vanillaStrategy', () => {
  const vanillaStrategy = createVanillaStrategy();

  const provider = new JsonRpcProvider('https://rpc.brovider.xyz/5');

  it('should return type', () => {
    expect(vanillaStrategy.type).toBe('vanilla');
  });

  describe('getVotingPower', () => {
    it('should compute voting power for user', async () => {
      const votingPower = await vanillaStrategy.getVotingPower(
        '0x395ed61716b48dc904140b515e9f682e33330154',
        '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
        null,
        9343895,
        '0x00',
        provider
      );

      expect(votingPower.toString()).toEqual('1');
    });
  });
});
