import { StarkNetTx } from '../src/clients';

const space = '0x0625dc1290b6e936be5f1a3e963cf629326b1f4dfd5a56738dea98e1ad31b7f3';
const client = new StarkNetTx();

describe('', () => {
  it('StarkNetTx.propose()', async () => {
    const author = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
    const executionHash = '1';
    const metadataUri = 'ipfs://QmNrm6xKuib1THtWkiN5CKtBEerQCDpUtmgDqiaU2xDmca';
    const receipt = await client.propose(author, space, executionHash, metadataUri);
    expect(receipt.code).toBe('TRANSACTION_RECEIVED');
  }, 360e3);

  it('StarkNetTx.vote()', async () => {
    const voter = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
    const proposal = '1';
    const choice = '2';
    const receipt = await client.vote(voter, space, proposal, choice);
    expect(receipt.code).toBe('TRANSACTION_RECEIVED');
  }, 360e3);
});
