import { defaultProvider } from 'starknet';
import { Wallet } from '@ethersproject/wallet';
import { EthereumSig } from '../../../../src/clients';
import { getStorageVarAddress } from '../../../../src/utils/encoding';
import { Choice } from '../../../../src/utils/choice';

const latestL1Block = 8050780;

describe('EthereumSig', () => {
  expect(process.env.GOERLI_NODE_URL).toBeDefined();

  const ethUrl = process.env.GOERLI_NODE_URL as string;
  const manaUrl = '';
  const starkProvider = defaultProvider;

  const ethSigClient = new EthereumSig({ ethUrl, starkProvider, manaUrl });
  const wallet = new Wallet('be2b70290c687fadeaac651bfc4578948ef25c932f6b0ae6e7f2047ce61bcbaa');
  const walletAddress = wallet.address;
  const space = '0x7e6e9047eb910f84f7e3b86cea7b1d7779c109c970a39b54379c1f4fa395b28';
  const authenticator = '0x64cce9272197eba6353f5bbf060e097e516b411e66e83a9cf5910a08697df14';
  const strategy = 1;
  const executor = '0x4ecc83848a519cc22b0d0ffb70e65ec8dde85d3d13439eff7145d4063cf6b4d';

  beforeAll(() => {
    const getStorageAt = defaultProvider.getStorageAt;
    jest.spyOn(defaultProvider, 'getStorageAt').mockImplementation((contractAddress, key) => {
      if (
        contractAddress === '0x69606dd1655fdbbf8189e88566c54890be8f7e4a3650398ac17f6586a4a336d' &&
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
      proposal: 3,
      choice: Choice.FOR
    });

    expect(envelope).toMatchSnapshot();
  });
});
