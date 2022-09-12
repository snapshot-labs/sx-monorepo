import singleSlotProofStrategy from '../../../src/strategies/singleSlotProof';
import { proposeEnvelope, voteEnvelope } from '../fixtures';

const ethUrl = process.env.GOERLI_NODE_URL as string;

describe('singleSlotProofStrategy', () => {
  it('should return type', () => {
    expect(singleSlotProofStrategy.type).toBe('singleSlotProof');
  });

  it('should return params for vote', async () => {
    const params = await singleSlotProofStrategy.getParams(
      'vote',
      '0x4bbd8081b1e9ef84ee2a767ef2cdcdea0dd8298b8e2858afa06bed1898533e6',
      voteEnvelope,
      { ethUrl }
    );

    expect(params).toMatchSnapshot();
  });

  it('should return params for propose', async () => {
    const params = await singleSlotProofStrategy.getParams(
      'propose',
      '0x4bbd8081b1e9ef84ee2a767ef2cdcdea0dd8298b8e2858afa06bed1898533e6',
      proposeEnvelope,
      { ethUrl }
    );

    expect(params).toMatchSnapshot();
  });

  it('should return extra propose calls', async () => {
    const params = await singleSlotProofStrategy.getExtraProposeCalls(
      '0x4bbd8081b1e9ef84ee2a767ef2cdcdea0dd8298b8e2858afa06bed1898533e6',
      proposeEnvelope,
      {
        ethUrl
      }
    );

    expect(params).toMatchSnapshot();
  });
});
