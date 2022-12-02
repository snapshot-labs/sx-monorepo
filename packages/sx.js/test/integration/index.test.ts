import { StarkNetTx, EthereumSig } from '../../src/clients';
import { getExecutionData } from '../../src/executors';
import { Account, Provider, ec } from 'starknet';
import { Wallet } from '@ethersproject/wallet';
import { Choice } from '../../src/utils/choice';

describe('StarkNetTx', () => {
  expect(process.env.STARKNET_ADDRESS).toBeDefined();
  expect(process.env.STARKNET_PK).toBeDefined();

  const ethUrl = process.env.GOERLI_NODE_URL as string;
  const address = process.env.STARKNET_ADDRESS as string;
  const privKey = process.env.STARKNET_PK as string;
  const manaUrl = '';

  const starkProvider = new Provider({ sequencer: { network: 'goerli-alpha-2' } });

  const wallet = Wallet.createRandom();
  const walletAddress = wallet.address;
  const account = new Account(starkProvider, address, ec.getKeyPair(privKey));

  describe('vanilla authenticator', () => {
    const client = new StarkNetTx({ starkProvider, ethUrl });
    const space = '0x7e6e9047eb910f84f7e3b86cea7b1d7779c109c970a39b54379c1f4fa395b28';
    const authenticator = '0x5e1f273ca9a11f78bfb291cbe1b49294cf3c76dd48951e7ab7db6d9fb1e7d62';
    const strategy = 0;
    const executor = '0x4ecc83848a519cc22b0d0ffb70e65ec8dde85d3d13439eff7145d4063cf6b4d';

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
    const client = new StarkNetTx({ starkProvider, ethUrl });
    const ethSigClient = new EthereumSig({ starkProvider, ethUrl, manaUrl });
    const space = '0x7e6e9047eb910f84f7e3b86cea7b1d7779c109c970a39b54379c1f4fa395b28';
    const authenticator = '0x64cce9272197eba6353f5bbf060e097e516b411e66e83a9cf5910a08697df14';
    const strategy = 0;
    const executor = '0x4ecc83848a519cc22b0d0ffb70e65ec8dde85d3d13439eff7145d4063cf6b4d';

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
        proposal: 2,
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

    const client = new StarkNetTx({ starkProvider, ethUrl });
    const ethSigClient = new EthereumSig({ starkProvider, ethUrl, manaUrl });
    const space = '0x7e6e9047eb910f84f7e3b86cea7b1d7779c109c970a39b54379c1f4fa395b28';
    const authenticator = '0x64cce9272197eba6353f5bbf060e097e516b411e66e83a9cf5910a08697df14';
    const strategy = 1;
    const executor = '0x4ecc83848a519cc22b0d0ffb70e65ec8dde85d3d13439eff7145d4063cf6b4d';

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
        proposal: 3,
        choice: Choice.FOR
      });

      const receipt = await client.vote(account, envelope);
      console.log('Receipt', receipt);

      // await defaultProvider.waitForTransaction(receipt.transaction_hash);

      expect(receipt.transaction_hash).toBeDefined();
    }, 60e3);
  });

  describe('zodiac execution', () => {
    const client = new StarkNetTx({ starkProvider, ethUrl });
    const space = '0x7e6e9047eb910f84f7e3b86cea7b1d7779c109c970a39b54379c1f4fa395b28';
    const authenticator = '0x5e1f273ca9a11f78bfb291cbe1b49294cf3c76dd48951e7ab7db6d9fb1e7d62';
    const strategy = 0;

    const executorAddress = '0x21dda40770f4317582251cffd5a0202d6b223dc167e5c8db25dc887d11eba81';
    const transactions = [
      {
        to: '0x2842c82E20ab600F443646e1BC8550B44a513D82',
        value: '0x0',
        data: '0x',
        operation: 0,
        nonce: 0
      }
    ];

    it('StarkNetTx.propose()', async () => {
      const executionData = getExecutionData(executorAddress, { transactions });

      const envelope = {
        address: walletAddress,
        sig: null,
        data: {
          message: {
            space,
            authenticator,
            strategies: [strategy],
            metadataUri: 'ipfs://QmNrm6xKuib1THtWkiN5CKtBEerQCDpUtmgDqiaU2xDmca',
            ...executionData
          }
        }
      };

      const receipt = await client.propose(account, envelope);
      console.log('Receipt', receipt);

      // await defaultProvider.waitForTransaction(receipt.transaction_hash);

      expect(receipt.transaction_hash).toBeDefined();
    }, 60e3);
  });
});
