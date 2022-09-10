import vanillaStrategy from '../../../src/strategies/vanilla';
import { envelope, metadata } from '../fixtures';

const ethUrl = process.env.GOERLI_NODE_URL as string;

describe('vanillaStrategy', () => {
  it('should return type', () => {
    expect(vanillaStrategy.type).toBe('vanilla');
  });

  it('should return params', async () => {
    const params = await vanillaStrategy.getParams(envelope, metadata, { ethUrl });

    expect(params).toEqual([]);
  });

  it('should return extra propose calls', async () => {
    const params = await vanillaStrategy.getExtraProposeCalls(envelope, metadata, { ethUrl });

    expect(params).toEqual([]);
  });
});
