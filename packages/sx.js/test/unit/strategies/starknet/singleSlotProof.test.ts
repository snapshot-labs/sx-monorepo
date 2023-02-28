import { defaultProvider } from 'starknet';
import createSingleSlotProofStrategy from '../../../../src/strategies/starknet/singleSlotProof';
import { defaultNetwork } from '../../../../src/networks';
import { getStorageVarAddress } from '../../../../src/utils/encoding';
import { proposeEnvelope, voteEnvelope } from '../../fixtures';

const ethUrl = process.env.GOERLI_NODE_URL as string;
const starkProvider = defaultProvider;

const latestL1Block = 8098550;

describe('singleSlotProofStrategy', () => {
  const singleSlotProofStrategy = createSingleSlotProofStrategy({
    fossilL1HeadersStoreAddress:
      '0x69606dd1655fdbbf8189e88566c54890be8f7e4a3650398ac17f6586a4a336d',
    fossilFactRegistryAddress: '0x2e39818908f0da118fde6b88b52e4dbdf13d2e171e488507f40deb6811bde3f'
  });
  const config = { starkProvider, ethUrl, networkConfig: defaultNetwork };

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
      config
    );

    expect(params).toMatchSnapshot();
  });

  it('should return params for propose', async () => {
    const params = await singleSlotProofStrategy.getParams(
      'propose',
      '0xd1b81feff3095ca9517fdfc7427e742ce96f7ca8f3b2664a21b2fba552493b',
      1,
      proposeEnvelope,
      config
    );

    expect(params).toMatchSnapshot();
  });

  it('should return extra propose calls', async () => {
    const params = await singleSlotProofStrategy.getExtraProposeCalls(
      '0xd1b81feff3095ca9517fdfc7427e742ce96f7ca8f3b2664a21b2fba552493b',
      1,
      proposeEnvelope,
      config
    );

    expect(params).toMatchSnapshot();
  });

  describe('getVotingPower', () => {
    const params = ['0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6', '0x3'];
    const timestamp = 1669849240;

    it('should compute voting power for user with delegated tokens', async () => {
      const votingPower = await singleSlotProofStrategy.getVotingPower(
        '0xd1b81feff3095ca9517fdfc7427e742ce96f7ca8f3b2664a21b2fba552493b',
        '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
        timestamp,
        params,
        config
      );

      expect(votingPower.toString()).toEqual('100000000000000000');
    }, 15_000);

    it('should compute voting power for user with delegated tokens and no matching timestamp (latest l1)', async () => {
      const votingPower = await singleSlotProofStrategy.getVotingPower(
        '0xd1b81feff3095ca9517fdfc7427e742ce96f7ca8f3b2664a21b2fba552493b',
        '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
        timestamp + 1,
        params,
        config
      );

      expect(votingPower.toString()).toEqual('1050000000000000000');
    }, 15_000);

    it('should compute voting power for user with no delegated tokens', async () => {
      const votingPower = await singleSlotProofStrategy.getVotingPower(
        '0xd1b81feff3095ca9517fdfc7427e742ce96f7ca8f3b2664a21b2fba552493b',
        '0x000000000000000000000000000000000000dead',
        timestamp,
        params,
        config
      );

      expect(votingPower.toString()).toEqual('0');
    }, 15_000);
  });
});
