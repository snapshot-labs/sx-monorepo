import { JsonRpcProvider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import { EthereumSig } from '../../../../../src/clients/evm/ethereum-sig';
import { Choice } from '../../../../../src/utils/choice';

describe('EthereumSig', () => {
  const space = '0x6d5608420702714a6c8168ec9c70706e8d1cf641';
  const authenticator = '0x86bfa0726cba0febeee457f04b705ab74b54d01c';
  const executor = '0xb1001fdf62c020761039a750b27e73c512fdaa5e';

  const provider = new JsonRpcProvider('http://127.0.0.1:8545');
  const signer = new Wallet(
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    provider
  );
  const ethSigClient = new EthereumSig();

  beforeAll(() => {
    jest.spyOn(ethSigClient, 'generateSalt').mockImplementation(() => 0);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should create propose envelope', async () => {
    const envelope = await ethSigClient.propose({
      signer,
      data: {
        space,
        authenticator,
        strategies: [{ index: 0, address: '0x395ed61716b48dc904140b515e9f682e33330154' }],
        executor: { index: 0, address: executor },
        executionParams: '0x00',
        metadataUri: 'ipfs://QmNrm6xKuib1THtWkiN5CKtBEerQCDpUtmgDqiaU2xDmca'
      }
    });

    expect(envelope).toMatchSnapshot();
  });

  it('should create vote envelope', async () => {
    const envelope = await ethSigClient.vote({
      signer,
      data: {
        space,
        authenticator,
        strategies: [{ index: 0, address: '0x395ed61716b48dc904140b515e9f682e33330154' }],
        proposal: 3,
        choice: Choice.FOR
      }
    });

    expect(envelope).toMatchSnapshot();
  });
});
