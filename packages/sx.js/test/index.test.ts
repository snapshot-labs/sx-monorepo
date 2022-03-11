import { propose, vote } from '../src';
// @ts-ignore
import constants from '../src/starknet/constants.json';

const space = constants.space;

describe('', () => {
  it('propose()', async () => {
    const executionHash = '1';
    const metadataUri = 'ipfs://QmfSnrEuuRnf1BwKH3moixCLFKNXf8GTRYWUifAxzo71rN';
    const receipt = await propose(space, executionHash, metadataUri);
    expect(receipt.code).toBe('TRANSACTION_RECEIVED');
  }, 360e3);

  it('vote()', async () => {
    const proposal = '1';
    const choice = '1';
    const receipt = await vote(space, proposal, choice);
    expect(receipt.code).toBe('TRANSACTION_RECEIVED');
  }, 360e3);
});
