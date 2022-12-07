import { defaultProvider } from 'starknet';
import createVanillaStrategy from '../../../src/strategies/vanilla';
import { defaultNetwork } from '../../../src/networks';
import { proposeEnvelope } from '../fixtures';

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
      '0x344a63d1f5cd0e5f707fede9886d5dd306e86eba91ea410b416f39e44c3865',
      0,
      proposeEnvelope,
      config
    );

    expect(params).toEqual([]);
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
});
