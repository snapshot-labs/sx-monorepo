import { JsonRpcProvider } from '@ethersproject/providers';
import createOzVotesStrategy from '../../../../src/strategies/evm/ozVotes';

describe('ozVotes', () => {
  const ozVotesStrategy = createOzVotesStrategy();

  const provider = new JsonRpcProvider('https://rpc.brovider.xyz/5');
  const params = '0xd96844c9b21cb6ccf2c236257c7fc703e43ba071';

  it('should return type', () => {
    expect(ozVotesStrategy.type).toBe('ozVotes');
  });

  describe('getVotingPower', () => {
    it('should compute voting power for user with delegated tokens at specific timestamp', async () => {
      const votingPower = await ozVotesStrategy.getVotingPower(
        '0x343Baf4b44F7f79b14301CFA8068E3F8BE7470De',
        '0x537f1896541d28F4c70116EEa602b1B34Da95163',
        1679408478,
        params,
        provider
      );

      expect(votingPower.toString()).toEqual('10000021');
    });

    it('should compute voting power for user without delegated tokens', async () => {
      const votingPower = await ozVotesStrategy.getVotingPower(
        '0x343Baf4b44F7f79b14301CFA8068E3F8BE7470De',
        '0x000000000000000000000000000000000000dead',
        1677159023,
        params,
        provider
      );

      expect(votingPower.toString()).toEqual('0');
    });
  });
});
