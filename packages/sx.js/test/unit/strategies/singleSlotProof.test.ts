import singleSlotProofStrategy from '../../../src/strategies/singleSlotProof';
import { envelope, metadata } from '../fixtures';

const ethUrl = process.env.GOERLI_NODE_URL as string;

describe('singleSlotProofStrategy', () => {
  it('should return type', () => {
    expect(singleSlotProofStrategy.type).toBe('singleSlotProof');
  });

  it('should return params', async () => {
    const params = await singleSlotProofStrategy.getParams(
      '0x4bbd8081b1e9ef84ee2a767ef2cdcdea0dd8298b8e2858afa06bed1898533e6',
      envelope,
      metadata,
      { ethUrl }
    );

    expect(params).toMatchSnapshot();
  });

  it('should return extra propose calls', async () => {
    const params = await singleSlotProofStrategy.getExtraProposeCalls(
      '0x4bbd8081b1e9ef84ee2a767ef2cdcdea0dd8298b8e2858afa06bed1898533e6',
      envelope,
      metadata,
      {
        ethUrl
      }
    );

    expect(params).toMatchSnapshot();
  });
});
