import { propose, vote } from '../src';
// @ts-ignore
import constants from '../src/starknet/constants.json';

const space = constants.space;

describe('', () => {
  it('propose()', async () => {
    const author = '0xeF8305E140ac520225DAf050e2f71d5fBcC543e7';
    const executionHash = '1';
    const metadataUri = 'ipfs://QmNrm6xKuib1THtWkiN5CKtBEerQCDpUtmgDqiaU2xDmca';
    const receipt = await propose(author, space, executionHash, metadataUri);
    expect(receipt.code).toBe('TRANSACTION_RECEIVED');
  }, 360e3);

  it('vote()', async () => {
    const voter = '0xeF8305E140ac520225DAf050e2f71d5fBcC543e7';
    const proposal = '1';
    const choice = '2';
    const receipt = await vote(voter, space, proposal, choice);
    expect(receipt.code).toBe('TRANSACTION_RECEIVED');
  }, 360e3);
});
