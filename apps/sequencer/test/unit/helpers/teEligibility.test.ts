/**
 * The eligibility public key that the sequencer freezes into a private proposal
 * and publishes for the hub. If it does not match the key that signs credentials,
 * nothing fails early: every ballot is later excluded as INVALID_ATTESTATION and
 * the tally is all zeros.
 */

import {
  getEligibilityKey,
  resetEligibilityKeyCache,
  TeEligibilityError
} from '../../../src/helpers/teEligibility';

const SK = '0x0000000000000000000000000000000000000000000000000000000000002a2a';

describe('getEligibilityKey', () => {
  afterEach(() => {
    delete process.env.TE_ELIGIBILITY_PRIVATE_KEY;
    resetEligibilityKeyCache();
  });

  it('returns a 48-byte compressed G1 key', async () => {
    process.env.TE_ELIGIBILITY_PRIVATE_KEY = SK;
    resetEligibilityKeyCache();
    await expect(getEligibilityKey()).resolves.toMatch(/^0x[0-9a-f]{96}$/);
  });

  // Throwing makes proposal creation fail, instead of freezing a placeholder key
  // that nothing can sign against. A zero key's public key is the identity, which
  // would make every signature valid.
  it.each([
    ['unset', undefined],
    ['empty', ''],
    ['not hex', 'nonsense'],
    ['wrong length', '0xdeadbeef'],
    ['zero', `0x${'00'.repeat(32)}`]
  ])('rejects a %s key rather than returning one', async (_label, value) => {
    if (value === undefined) delete process.env.TE_ELIGIBILITY_PRIVATE_KEY;
    else process.env.TE_ELIGIBILITY_PRIVATE_KEY = value;
    resetEligibilityKeyCache();
    await expect(getEligibilityKey()).rejects.toThrow(TeEligibilityError);
  });
});
