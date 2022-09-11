import vanillaStrategy from '../../../src/strategies/vanilla';
import { envelope, metadata } from '../fixtures';

const ethUrl = process.env.GOERLI_NODE_URL as string;

describe('vanillaStrategy', () => {
  it('should return type', () => {
    expect(vanillaStrategy.type).toBe('vanilla');
  });

  it('should return params', async () => {
    const params = await vanillaStrategy.getParams(
      '0x344a63d1f5cd0e5f707fede9886d5dd306e86eba91ea410b416f39e44c3865',
      envelope,
      metadata,
      { ethUrl }
    );

    expect(params).toEqual([]);
  });

  it('should return extra propose calls', async () => {
    const params = await vanillaStrategy.getExtraProposeCalls(
      '0x344a63d1f5cd0e5f707fede9886d5dd306e86eba91ea410b416f39e44c3865',
      envelope,
      metadata,
      { ethUrl }
    );

    expect(params).toEqual([]);
  });
});
