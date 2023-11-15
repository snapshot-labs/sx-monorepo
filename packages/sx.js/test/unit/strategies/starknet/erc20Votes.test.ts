import { Provider } from 'starknet';
import createErc20VotesStrategy from '../../../../src/strategies/starknet/erc20Votes';
import { defaultNetwork } from '../../../../src/networks';
import { proposeEnvelope } from '../../fixtures';

const ethUrl = process.env.GOERLI_NODE_URL as string;
const starkProvider = new Provider({
  rpc: {
    nodeUrl: 'https://starknet-goerli.infura.io/v3/46a5dd9727bf48d4a132672d3f376146'
  }
});

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
    const timestamp = 1699960000;

    it('should compute voting power for user', async () => {
      const votingPower = await erc20VotesStrategy.getVotingPower(
        '0x0619040eb54857252396d0bf337dc7a7f98182fa015c11578201105038106cb7',
        '0x7ff6b17f07c4d83236e3fc5f94259a19d1ed41bbcf1822397ea17882e9b038d',
        null,
        timestamp,
        ['0x05936cbb910e8f16a670e26f1ae3d91925be439b597b4e5e5b0c674ddd7149fa'],
        config
      );

      expect(votingPower.toString()).toEqual('79228132514264337593543950335');
    });
  });
});
