import { defaultProvider } from 'starknet';
import singleSlotProofStrategy from '../../../src/strategies/singleSlotProof';
import { getStorageVarAddress } from '../../../src/utils/encoding';
import { proposeEnvelope, voteEnvelope } from '../fixtures';

const ethUrl = process.env.GOERLI_NODE_URL as string;
const starkProvider = defaultProvider;

const latestL1Block = 8050780;

describe('singleSlotProofStrategy', () => {
  let getStorageAtSpy;
  beforeAll(() => {
    const getStorageAt = starkProvider.getStorageAt;

    getStorageAtSpy = jest
      .spyOn(starkProvider, 'getStorageAt')
      .mockImplementation((contractAddress, key) => {
        if (
          contractAddress === '0x69606dd1655fdbbf8189e88566c54890be8f7e4a3650398ac17f6586a4a336d' &&
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
      '0xd1b81feff3095ca9517fdfc7427e742ce96f7ca8f3b2664a21b2fba552493b',
      1,
      voteEnvelope,
      { ethUrl, starkProvider }
    );

    expect(params).toMatchSnapshot();
  });

  it('should return params for propose', async () => {
    const params = await singleSlotProofStrategy.getParams(
      'propose',
      '0xd1b81feff3095ca9517fdfc7427e742ce96f7ca8f3b2664a21b2fba552493b',
      1,
      proposeEnvelope,
      { ethUrl, starkProvider }
    );

    expect(params).toMatchSnapshot();
  });

  it('should return extra propose calls', async () => {
    const params = await singleSlotProofStrategy.getExtraProposeCalls(
      '0xd1b81feff3095ca9517fdfc7427e742ce96f7ca8f3b2664a21b2fba552493b',
      1,
      proposeEnvelope,
      { ethUrl, starkProvider }
    );

    expect(params).toMatchSnapshot();
  });
});
