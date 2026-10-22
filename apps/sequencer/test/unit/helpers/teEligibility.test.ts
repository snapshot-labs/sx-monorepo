/**
 * The eligibility public key that the sequencer freezes into a private proposal.
 * If it does not match the key that signs credentials,
 * nothing fails early: every ballot is later excluded as INVALID_ATTESTATION and
 * the tally is all zeros.
 */

import {
  resetIssuer,
  SgpAttestationError
} from '../../../src/helpers/sgpAttestation';
import {
  getEligibilityKey,
  isEligibilityKeyRotated
} from '../../../src/helpers/teEligibility';

const SK = '0x0000000000000000000000000000000000000000000000000000000000002a2a';

describe('getEligibilityKey', () => {
  afterEach(() => {
    delete process.env.TE_ELIGIBILITY_PRIVATE_KEY;
    resetIssuer();
  });

  it('returns a 48-byte compressed G1 key', async () => {
    process.env.TE_ELIGIBILITY_PRIVATE_KEY = SK;
    resetIssuer();
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
    resetIssuer();
    await expect(getEligibilityKey()).rejects.toThrow(SgpAttestationError);
  });
});

describe('isEligibilityKeyRotated', () => {
  beforeAll(() => {
    process.env.TE_ELIGIBILITY_PRIVATE_KEY = SK;
    resetIssuer();
  });
  afterAll(() => {
    delete process.env.TE_ELIGIBILITY_PRIVATE_KEY;
    resetIssuer();
  });

  const frozenOn = (eligibilityKey: unknown) => ({
    te_sgp_config: JSON.stringify({ eligibilityKey })
  });

  it('is false while the frozen key is the key in use', async () => {
    const current = await getEligibilityKey();
    expect(await isEligibilityKeyRotated(frozenOn(current.toUpperCase()))).toBe(
      false
    );
  });

  it('is true once the key in use differs from the frozen one', async () => {
    expect(
      await isEligibilityKeyRotated(frozenOn(`0x${'cd'.repeat(48)}`))
    ).toBe(true);
  });

  // No frozen key means a malformed config; the ballot check refuses that itself.
  it('is false when the proposal has no frozen key', async () => {
    expect(await isEligibilityKeyRotated({ te_sgp_config: null })).toBe(false);
  });
});
