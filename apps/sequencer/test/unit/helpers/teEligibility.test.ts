/**
 * The key the sequencer freezes into a proposal, and publishes for the hub.
 *
 * Untested until now, despite being called at three points in `writer/proposal.ts`
 * and `writer/update-proposal.ts` — the code that decides which key a private
 * proposal will be verified against for the rest of its life. It also changed
 * implementation twice: an HTTP fetch from the hub, then a local derivation once
 * the private key moved here.
 *
 * The failure it guards against is the expensive kind. A key frozen into a
 * proposal that does not match the one credentials are actually signed with is
 * not caught at creation, or at voting, or at aggregation — it surfaces as every
 * ballot excluded as INVALID_ATTESTATION and a tally of all zeros, hours later.
 */

import { eligibilityPublicKey } from '../../../src/helpers/gegAttestation';
import {
  getEligibilityKey,
  resetEligibilityKeyCache,
  TeEligibilityError
} from '../../../src/helpers/teEligibility';

const SK = '0x0000000000000000000000000000000000000000000000000000000000002a2a';
const OTHER_SK =
  '0x0000000000000000000000000000000000000000000000000000000000009999';

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

  // The value frozen into a proposal must be the public half of the key that
  // signs its credentials. If these two ever diverge, every ballot on that
  // proposal fails verification and the tally reads as a legitimate zero.
  it('is the public half of the signing key', async () => {
    process.env.TE_ELIGIBILITY_PRIVATE_KEY = SK;
    resetEligibilityKeyCache();
    await expect(getEligibilityKey()).resolves.toBe(
      await eligibilityPublicKey()
    );
  });

  it('is deterministic for a given private key', async () => {
    process.env.TE_ELIGIBILITY_PRIVATE_KEY = SK;
    resetEligibilityKeyCache();
    const first = await getEligibilityKey();
    resetEligibilityKeyCache();
    expect(await getEligibilityKey()).toBe(first);
  });

  it('follows the configured key rather than a stale copy', async () => {
    process.env.TE_ELIGIBILITY_PRIVATE_KEY = SK;
    resetEligibilityKeyCache();
    const before = await getEligibilityKey();

    process.env.TE_ELIGIBILITY_PRIVATE_KEY = OTHER_SK;
    resetEligibilityKeyCache();
    expect(await getEligibilityKey()).not.toBe(before);
  });

  // Proposal creation awaits this, so throwing is what refuses a private
  // proposal that could never be tallied. Returning a placeholder would freeze
  // a key nothing can sign against.
  it.each([
    ['unset', undefined],
    ['empty', ''],
    ['not hex', 'nonsense'],
    ['wrong length', '0xdeadbeef']
  ])('rejects a %s key rather than returning one', async (_label, value) => {
    if (value === undefined) delete process.env.TE_ELIGIBILITY_PRIVATE_KEY;
    else process.env.TE_ELIGIBILITY_PRIVATE_KEY = value;
    resetEligibilityKeyCache();
    await expect(getEligibilityKey()).rejects.toThrow(TeEligibilityError);
  });
});
