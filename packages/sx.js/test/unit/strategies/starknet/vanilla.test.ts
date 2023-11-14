import { defaultProvider } from 'starknet';
import createVanillaStrategy from '../../../../src/strategies/starknet/vanilla';
import { defaultNetwork } from '../../../../src/networks';
import { proposeEnvelope } from '../../fixtures';

const ethUrl = process.env.GOERLI_NODE_URL as string;
const starkProvider = defaultProvider;

describe('vanillaStrategy', () => {
  const vanillaStrategy = createVanillaStrategy();
  const config = { starkProvider, ethUrl, networkConfig: defaultNetwork };

  it('should return type', () => {
    expect(vanillaStrategy.type).toBe('vanilla');
  });

  it('should return params', async () => {
    const params = await vanillaStrategy.getParams(
      'vote',
      '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
      '0x344a63d1f5cd0e5f707fede9886d5dd306e86eba91ea410b416f39e44c3865',
      0,
      null,
      proposeEnvelope,
      config
    );

    expect(params).toEqual(['0x0']);
  });

  it('should return extra propose calls', async () => {
    const params = await vanillaStrategy.getExtraProposeCalls(
      '0x344a63d1f5cd0e5f707fede9886d5dd306e86eba91ea410b416f39e44c3865',
      0,
      proposeEnvelope,
      config
    );

    expect(params).toEqual([]);
  });

  describe('getVotingPower', () => {
    const timestamp = 1669849240;

    it('should compute voting power for user', async () => {
      const votingPower = await vanillaStrategy.getVotingPower(
        '0x058623786b93d9b6ed1f83cec5c6fa6bea5f399d2795ee56a6123bdd83f5aa48',
        '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
        null,
        timestamp,
        ['0x00'],
        config
      );

      expect(votingPower.toString()).toEqual('1');
    });
  });
});
