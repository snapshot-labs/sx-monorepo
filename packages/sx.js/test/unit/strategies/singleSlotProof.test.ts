import singleSlotProofStrategy from '../../../src/strategies/singleSlotProof';
import { envelope, metadata } from '../fixtures';

const ethUrl = process.env.GOERLI_NODE_URL as string;

describe('singleSlotProofStrategy', () => {
  it('should return type', () => {
    expect(singleSlotProofStrategy.type).toBe('singleSlotProof');
  });

  it('should return params', async () => {
    const params = await singleSlotProofStrategy.getParams(envelope, metadata, { ethUrl });

    expect(params).toMatchSnapshot();
  });

  it('should return extra propose calls', async () => {
    const params = await singleSlotProofStrategy.getExtraProposeCalls(envelope, metadata, {
      ethUrl
    });

    expect(params).toMatchSnapshot();
  });
});
