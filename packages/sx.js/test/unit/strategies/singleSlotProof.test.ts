import { defaultProvider } from 'starknet';
import singleSlotProofStrategy from '../../../src/strategies/singleSlotProof';
import { getStorageVarAddress } from '../../../src/utils/encoding';
import { proposeEnvelope, voteEnvelope } from '../fixtures';

const ethUrl = process.env.GOERLI_NODE_URL as string;
const starkProvider = defaultProvider;

const latestL1Block = 7541971;

describe('singleSlotProofStrategy', () => {
  let getStorageAtSpy;
  beforeAll(() => {
    const getStorageAt = starkProvider.getStorageAt;

    getStorageAtSpy = jest
      .spyOn(starkProvider, 'getStorageAt')
      .mockImplementation((contractAddress, key) => {
        if (
          contractAddress === '0x6ca3d25e901ce1fff2a7dd4079a24ff63ca6bbf8ba956efc71c1467975ab78f' &&
          key === getStorageVarAddress('_latest_l1_block')
        ) {
          return Promise.resolve(latestL1Block.toString(16));
        }

        return getStorageAt.call(starkProvider, contractAddress, key);
      });
  });

  afterAll(() => {
    getStorageAtSpy.mockRestore();
  });

  it('should return type', () => {
    expect(singleSlotProofStrategy.type).toBe('singleSlotProof');
  });

  it('should return params for vote', async () => {
    const params = await singleSlotProofStrategy.getParams(
      'vote',
      '0x68da98d7798439f16b63b61644e7b27c932d5c051a455a978aa95488d5dcc9b',
      0,
      voteEnvelope,
      { ethUrl, starkProvider }
    );

    expect(params).toMatchSnapshot();
  });

  it('should return params for propose', async () => {
    const params = await singleSlotProofStrategy.getParams(
      'propose',
      '0x68da98d7798439f16b63b61644e7b27c932d5c051a455a978aa95488d5dcc9b',
      0,
      proposeEnvelope,
      { ethUrl, starkProvider }
    );

    expect(params).toMatchSnapshot();
  });

  it('should return extra propose calls', async () => {
    const params = await singleSlotProofStrategy.getExtraProposeCalls(
      '0x68da98d7798439f16b63b61644e7b27c932d5c051a455a978aa95488d5dcc9b',
      0,
      proposeEnvelope,
      { ethUrl, starkProvider }
    );

    expect(params).toMatchSnapshot();
  });
});
