import { propose, vote } from '../src';
import constants from '../src/starknet/constants.json';

const space = constants.space;

describe('', () => {
  it('propose()', async () => {
    const receipt = await propose(space);
    expect(receipt.code).toBe('TRANSACTION_RECEIVED');
  }, 360e3);

  it('vote()', async () => {
    const receipt = await vote(space);
    expect(receipt.code).toBe('TRANSACTION_RECEIVED');
  }, 360e3);
});
