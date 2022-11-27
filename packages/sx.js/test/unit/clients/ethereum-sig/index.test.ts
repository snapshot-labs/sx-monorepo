import { defaultProvider } from 'starknet';
import { Wallet } from '@ethersproject/wallet';
import { EthereumSig } from '../../../../src/clients';
import { getStorageVarAddress } from '../../../../src/utils/encoding';
import { Choice } from '../../../../src/utils/choice';

const latestL1Block = 7583800;

describe('EthereumSig', () => {
  expect(process.env.GOERLI_NODE_URL).toBeDefined();

  const ethUrl = process.env.GOERLI_NODE_URL as string;
  const manaUrl = '';
  const starkProvider = defaultProvider;

  const ethSigClient = new EthereumSig({ ethUrl, starkProvider, manaUrl });
  const wallet = new Wallet('be2b70290c687fadeaac651bfc4578948ef25c932f6b0ae6e7f2047ce61bcbaa');
  const walletAddress = wallet.address;
  const space = '0x4b7cff71219e275676e0ca23579f41b99dd1d1bd01adc7d7f1bc917d448e57d';
  const authenticator = '0x6aac1e90da5df37bd59ac52b638a22de15231cbb78353b121df987873d0f369';
  const strategy = 0;
  const executor = '0x70d94f64cfab000f8e26318f4413dfdaa1f19a3695e3222297edc62bbc936c7';

  beforeAll(() => {
    const getStorageAt = defaultProvider.getStorageAt;
    jest.spyOn(defaultProvider, 'getStorageAt').mockImplementation((contractAddress, key) => {
      if (
        contractAddress === '0x6ca3d25e901ce1fff2a7dd4079a24ff63ca6bbf8ba956efc71c1467975ab78f' &&
        key === getStorageVarAddress('_latest_l1_block')
      ) {
        return Promise.resolve(latestL1Block.toString(16));
      }

      return getStorageAt.call(defaultProvider, contractAddress, key);
    });

    jest.spyOn(ethSigClient, 'generateSalt').mockImplementation(() => 0);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should create propose envelope', async () => {
    const envelope = await ethSigClient.propose(wallet, walletAddress, {
      space,
      authenticator,
      strategies: [strategy],
      executor,
      metadataUri: 'ipfs://QmNrm6xKuib1THtWkiN5CKtBEerQCDpUtmgDqiaU2xDmca',
      executionParams: []
    });

    expect(envelope).toMatchSnapshot();
  });

  it('should create vote envelope', async () => {
    const envelope = await ethSigClient.vote(wallet, walletAddress, {
      space,
      authenticator,
      strategies: [strategy],
      proposal: 1,
      choice: Choice.FOR
    });

    expect(envelope).toMatchSnapshot();
  });
});
