import { Wallet } from '@ethersproject/wallet';
import { EthereumSig } from '../../../../src/clients';
import { Choice } from '../../../../src/utils/choice';

describe('EthereumSig', () => {
  expect(process.env.GOERLI_NODE_URL).toBeDefined();

  const ethUrl = process.env.GOERLI_NODE_URL as string;
  const manaUrl = '';

  const ethSigClient = new EthereumSig({ ethUrl, manaUrl });
  const wallet = new Wallet('be2b70290c687fadeaac651bfc4578948ef25c932f6b0ae6e7f2047ce61bcbaa');
  const walletAddress = wallet.address;
  const space = '0x0375bc9b4d236f961cbc5410213cdbf2de6dfe30f21b2c58bb4de3713d868383';
  const authenticator = '0x4bbd4959806784f2ad7541e36eda88d9b3dff1baef60b39862abc171f3eed38';
  const strategy = 0;
  const executor = '0x6b429254760eea72cedb8e6485ebf090ced630a366012994296ceb253b42aeb';

  beforeAll(() => {
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
      proposal: 2,
      choice: Choice.FOR
    });

    expect(envelope).toMatchSnapshot();
  });
});
