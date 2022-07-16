import { StarkNetTx } from '../src/clients';
import { Account, defaultProvider, ec } from 'starknet';
import { Wallet } from '@ethersproject/wallet';

describe('', () => {
  const wallet = Wallet.createRandom();
  const walletAddress = wallet.address;
  const space = '0x0625dc1290b6e936be5f1a3e963cf629326b1f4dfd5a56738dea98e1ad31b7f3';
  const client = new StarkNetTx();
  const address = '0x00c26a3cdcc570da83f3dd6afd0db9d038ee096e2c56707d6348db3b06223427';
  const privKey = '0x78a61bf2d838b1094705168bbd5b462e665a5ce094d8b1c2e5438c66eeb9f59';
  const starkKeyPair = ec.getKeyPair(privKey);
  const account = new Account(defaultProvider, address, starkKeyPair);

  it('StarkNetTx.propose()', async () => {
    const author = walletAddress;
    const executionHash = '0';
    const metadataUri = 'ipfs://QmNrm6xKuib1THtWkiN5CKtBEerQCDpUtmgDqiaU2xDmca';

    const receipt = await client.propose(account, author, space, executionHash, metadataUri);
    console.log('Receipt', receipt);

    // await defaultProvider.waitForTransaction(receipt.transaction_hash);

    expect(receipt.code).toBe('TRANSACTION_RECEIVED');
  }, 300e3);

  it('StarkNetTx.vote()', async () => {
    const voter = walletAddress;
    const proposal = '3';
    const choice = '1';

    const receipt = await client.vote(account, voter, space, proposal, choice);
    console.log('Receipt', receipt);

    // await defaultProvider.waitForTransaction(receipt.transaction_hash);

    expect(receipt.code).toBe('TRANSACTION_RECEIVED');
  }, 300e3);
});
