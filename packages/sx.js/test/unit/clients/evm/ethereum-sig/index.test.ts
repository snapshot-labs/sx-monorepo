import { JsonRpcProvider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import { EthereumSig } from '../../../../../src/clients/evm/ethereum-sig';
import { Choice } from '../../../../../src/utils/choice';

describe('EthereumSig', () => {
  const space = '0x6d5608420702714a6c8168ec9c70706e8d1cf641';
  const authenticator = '0x277f388b77cd36fff1c0e976c49a7c54413a449a';
  const executor = '0x6241b5c89350bb3c465179706cf26050ea32444f';

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
        strategies: [{ index: 0, address: '0xf3e55d22845689be3e062975444d09799e522a6c' }],
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
        strategies: [{ index: 0, address: '0xf3e55d22845689be3e062975444d09799e522a6c' }],
        proposal: 1,
        choice: Choice.FOR,
        metadataUri: ''
      }
    });

    expect(envelope).toMatchSnapshot();
  });
});
