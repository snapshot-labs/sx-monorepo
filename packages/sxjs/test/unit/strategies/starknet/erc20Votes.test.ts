import { defaultProvider } from 'starknet';
import createErc20VotesStrategy from '../../../../src/strategies/starknet/erc20Votes';
import { defaultNetwork } from '../../../../src/networks';
import { proposeEnvelope } from '../../fixtures';

const ethUrl = process.env.GOERLI_NODE_URL as string;
const starkProvider = defaultProvider;

describe('erc20VotesStrategy', () => {
  const erc20VotesStrategy = createErc20VotesStrategy();
  const config = { starkProvider, ethUrl, networkConfig: defaultNetwork };

  it('should return type', () => {
    expect(erc20VotesStrategy.type).toBe('erc20Votes');
  });

  it('should return params', async () => {
    const params = await erc20VotesStrategy.getParams(
      'vote',
      '0x0679a64fb03683f0aea697da37e2b62549f5d527aadd7fa06f7cb4a0dd8f7f58',
      '0x344a63d1f5cd0e5f707fede9886d5dd306e86eba91ea410b416f39e44c3865',
      0,
      null,
      proposeEnvelope,
      config
    );

    expect(params).toEqual([]);
  });

  it('should throw for ethereum address', async () => {
    expect(
      erc20VotesStrategy.getParams(
        'vote',
        '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
        '0x344a63d1f5cd0e5f707fede9886d5dd306e86eba91ea410b416f39e44c3865',
        0,
        null,
        proposeEnvelope,
        config
      )
    ).rejects.toThrow('Not supported for Ethereum addresses');
  });

  it('should return extra propose calls', async () => {
    const params = await erc20VotesStrategy.getExtraProposeCalls(
      '0x344a63d1f5cd0e5f707fede9886d5dd306e86eba91ea410b416f39e44c3865',
      0,
      proposeEnvelope,
      config
    );

    expect(params).toEqual([]);
  });

  describe('getVotingPower', () => {
    const timestamp = 1692624166;

    it('should compute voting power for user', async () => {
      const votingPower = await erc20VotesStrategy.getVotingPower(
        '0x0448605452b2c8a7c6347215fcfb73678ebe56d01067e664c47d14e6702b2334',
        '0x06AbD599AB530c5b3bc603111Bdd20d77890Db330402dC870Fc9866f50eD6d2A',
        null,
        timestamp,
        ['0x01c54ddc2339eb359c82ba9c5a988342ee259d31d84e4e3e88d3ade93028a745'],
        config
      );

      expect(votingPower.toString()).toEqual('1000');
    });
  });
});
