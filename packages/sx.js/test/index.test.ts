import { StarkNetTx } from '../src/clients';
import { Account, defaultProvider, ec } from 'starknet';
import { Wallet } from '@ethersproject/wallet';

describe('', () => {
  // Factory: 0x3e5165026e6586cd2d5cdf1fdced8af866f900e430bf1dc7b839c84604c506e
  // Spaces
  // [vanilla auth, vanilla voting strategy]
  // 0x03ddbcdfec756eb9e9e0fbce7a90721570a09fc97d31a15b8e40769b93ecb957
  // [ethSig auth, vanilla voting strategy]
  // 0x03a48d8a7e80b7b295ef15efc4e1604e78b1f4460266cd460b6eb8826846bba0
  // [ethSig auth, single slot proof (WETH goerli)]
  // 0x069555971fbf76b3d0471297818ed93986fdd7afe3816d53ea8d8e72034260d8

  const wallet = Wallet.createRandom();
  const walletAddress = wallet.address;
  const space = '0x03ddbcdfec756eb9e9e0fbce7a90721570a09fc97d31a15b8e40769b93ecb957';
  const client = new StarkNetTx();
  const address = '0x00c26a3cdcc570da83f3dd6afd0db9d038ee096e2c56707d6348db3b06223427';
  const privKey = '0x78a61bf2d838b1094705168bbd5b462e665a5ce094d8b1c2e5438c66eeb9f59';
  const starkKeyPair = ec.getKeyPair(privKey);
  const account = new Account(defaultProvider, address, starkKeyPair);

  it('StarkNetTx.propose()', async () => {
    const author = walletAddress;
    const metadataUri = 'ipfs://QmNrm6xKuib1THtWkiN5CKtBEerQCDpUtmgDqiaU2xDmca';

    const receipt = await client.propose(account, author, space, metadataUri);
    console.log('Receipt', receipt);

    // await defaultProvider.waitForTransaction(receipt.transaction_hash);

    expect(receipt.code).toBe('TRANSACTION_RECEIVED');
  }, 300e3);

  it('StarkNetTx.vote()', async () => {
    const voter = walletAddress;
    const proposal = '1';
    const choice = '1';

    const receipt = await client.vote(account, voter, space, proposal, choice);
    console.log('Receipt', receipt);

    // await defaultProvider.waitForTransaction(receipt.transaction_hash);

    expect(receipt.code).toBe('TRANSACTION_RECEIVED');
  }, 300e3);
});
