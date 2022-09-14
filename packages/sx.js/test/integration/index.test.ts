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
    const client = new StarkNetTx({ ethUrl });
    const space = '0xe4524f240f31334d0970d8516f1e8135308c7f4aa6867cae2bb4a53fa656e1';
    const authenticator = '0x36f53ac6efe16403267873d307db90b5cc10c97fd3353af3107609bb63f9f83';
    const strategy = 0;
    const executor = '0x6b429254760eea72cedb8e6485ebf090ced630a366012994296ceb253b42aeb';

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
            executor,
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
    const client = new StarkNetTx({ ethUrl });
    const ethSigClient = new EthereumSig({ ethUrl, manaUrl });
    const space = '0x0072064a0d2d717fcb4bb6af182a652e7deb1d0eef8dc126e3062bf6dda0156b';
    const authenticator = '0x4bbd4959806784f2ad7541e36eda88d9b3dff1baef60b39862abc171f3eed38';
    const strategy = 0;
    const executor = '0x6b429254760eea72cedb8e6485ebf090ced630a366012994296ceb253b42aeb';

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
        executor,
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

    const client = new StarkNetTx({ ethUrl });
    const ethSigClient = new EthereumSig({ ethUrl, manaUrl });
    const space = '0x0375bc9b4d236f961cbc5410213cdbf2de6dfe30f21b2c58bb4de3713d868383';
    const authenticator = '0x4bbd4959806784f2ad7541e36eda88d9b3dff1baef60b39862abc171f3eed38';
    const strategy = 0;
    const executor = '0x6b429254760eea72cedb8e6485ebf090ced630a366012994296ceb253b42aeb';

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
        executor,
        proposal: 2,
        choice: Choice.FOR
      });

      const receipt = await client.vote(account, envelope);
      console.log('Receipt', receipt);

      // await defaultProvider.waitForTransaction(receipt.transaction_hash);

      expect(receipt.transaction_hash).toBeDefined();
    }, 60e3);
  });
});
