import { StarkNetTx, EthereumSig } from '../../src/clients';
import { Account, defaultProvider, ec } from 'starknet';
import { Wallet } from '@ethersproject/wallet';
import { Choice } from '../../src/utils/choice';

describe('StarkNetTx', () => {
  const ethUrl = process.env.GOERLI_NODE_URL as string;
  const manaUrl = '';

  const wallet = Wallet.createRandom();
  const walletAddress = wallet.address;
  const address = '0x00c26a3cdcc570da83f3dd6afd0db9d038ee096e2c56707d6348db3b06223427';
  const privKey = '0x78a61bf2d838b1094705168bbd5b462e665a5ce094d8b1c2e5438c66eeb9f59';
  const starkKeyPair = ec.getKeyPair(privKey);
  const account = new Account(defaultProvider, address, starkKeyPair);

  describe('vanilla authenticator', () => {
    const client = new StarkNetTx({ starkProvider: defaultProvider, ethUrl });
    const space = '0x847ae39833c61fe964bfac857ad8c5fa261ec4c716c61b8f28c4ae61fe376b';
    const authenticator = '0xb32364e042cb948be62a09355595a4b80dfff4eb11a485c1950ace70b0e835';
    const strategy = 0;
    const executor = '0x70d94f64cfab000f8e26318f4413dfdaa1f19a3695e3222297edc62bbc936c7';

    it('StarkNetTx.propose()', async () => {
      const envelope = {
        address: walletAddress,
        sig: null,
        data: {
          message: {
            space,
            authenticator,
            strategies: [strategy],
            executor,
            metadataUri: 'ipfs://QmNrm6xKuib1THtWkiN5CKtBEerQCDpUtmgDqiaU2xDmca',
            executionParams: []
          }
        }
      };

      const receipt = await client.propose(account, envelope);
      console.log('Receipt', receipt);

      // await defaultProvider.waitForTransaction(receipt.transaction_hash);

      expect(receipt.transaction_hash).toBeDefined();
    }, 60e3);

    it('StarkNetTx.vote()', async () => {
      const envelope = {
        address: walletAddress,
        sig: null,
        data: {
          message: {
            space,
            authenticator,
            strategies: [strategy],
            proposal: 1,
            choice: Choice.FOR
          }
        }
      };

      const receipt = await client.vote(account, envelope);
      console.log('Receipt', receipt);

      // await defaultProvider.waitForTransaction(receipt.transaction_hash);

      expect(receipt.transaction_hash).toBeDefined();
    }, 60e3);
  });

  describe('ethSig authenticator', () => {
    const client = new StarkNetTx({ starkProvider: defaultProvider, ethUrl });
    const ethSigClient = new EthereumSig({ starkProvider: defaultProvider, ethUrl, manaUrl });
    const space = '0xb60f2a154b9aaec8e4bec8e04f86d6cd92a9c993871e904bd815962603492d';
    const authenticator = '0x6aac1e90da5df37bd59ac52b638a22de15231cbb78353b121df987873d0f369';
    const strategy = 0;
    const executor = '0x70d94f64cfab000f8e26318f4413dfdaa1f19a3695e3222297edc62bbc936c7';

    it('StarkNetTx.propose()', async () => {
      const envelope = await ethSigClient.propose(wallet, walletAddress, {
        space,
        authenticator,
        strategies: [strategy],
        executor,
        metadataUri: 'ipfs://QmNrm6xKuib1THtWkiN5CKtBEerQCDpUtmgDqiaU2xDmca',
        executionParams: []
      });

      const receipt = await client.propose(account, envelope);
      console.log('Receipt', receipt);

      // await defaultProvider.waitForTransaction(receipt.transaction_hash);

      expect(receipt.transaction_hash).toBeDefined();
    }, 60e3);

    it('StarkNetTx.vote()', async () => {
      const envelope = await ethSigClient.vote(wallet, walletAddress, {
        space,
        authenticator,
        strategies: [strategy],
        proposal: 1,
        choice: Choice.FOR
      });

      const receipt = await client.vote(account, envelope);
      console.log('Receipt', receipt);

      // await defaultProvider.waitForTransaction(receipt.transaction_hash);

      expect(receipt.transaction_hash).toBeDefined();
    }, 60e3);
  });

  describe('ethSig authenticator + single slot proof', () => {
    expect(process.env.GOERLI_NODE_URL).toBeDefined();
    expect(process.env.ETH_PK).toBeDefined();

    const wallet = new Wallet(process.env.ETH_PK as string);
    const walletAddress = wallet.address;

    const client = new StarkNetTx({ starkProvider: defaultProvider, ethUrl });
    const ethSigClient = new EthereumSig({ starkProvider: defaultProvider, ethUrl, manaUrl });
    const space = '0x4b7cff71219e275676e0ca23579f41b99dd1d1bd01adc7d7f1bc917d448e57d';
    const authenticator = '0x6aac1e90da5df37bd59ac52b638a22de15231cbb78353b121df987873d0f369';
    const strategy = 0;
    const executor = '0x70d94f64cfab000f8e26318f4413dfdaa1f19a3695e3222297edc62bbc936c7';

    it('StarkNetTx.propose()', async () => {
      const envelope = await ethSigClient.propose(wallet, walletAddress, {
        space,
        authenticator,
        strategies: [strategy],
        executor,
        metadataUri: 'ipfs://QmNrm6xKuib1THtWkiN5CKtBEerQCDpUtmgDqiaU2xDmca',
        executionParams: []
      });

      const receipt = await client.propose(account, envelope);
      console.log('Receipt', receipt);

      // await defaultProvider.waitForTransaction(receipt.transaction_hash);

      expect(receipt.transaction_hash).toBeDefined();
    }, 60e3);

    it('StarkNetTx.vote()', async () => {
      const envelope = await ethSigClient.vote(wallet, walletAddress, {
        space,
        authenticator,
        strategies: [strategy],
        proposal: 1,
        choice: Choice.FOR
      });

      const receipt = await client.vote(account, envelope);
      console.log('Receipt', receipt);

      // await defaultProvider.waitForTransaction(receipt.transaction_hash);

      expect(receipt.transaction_hash).toBeDefined();
    }, 60e3);
  });
});
