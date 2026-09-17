/**
 * The eligibility credential — the ingest self-check.
 *
 * `gegAttestation.ts` assembles the signed message itself: the crypto package is
 * an unmodified published dependency and does not expose its transcript bytes.
 * A one-character slip in that framing produces an election where every ballot is
 * silently excluded and the tally comes out as zeros, with no runtime signal —
 * the keypers simply reject credentials they cannot verify.
 *
 * This file used to check that framing against the protocol's own corpus in both
 * directions. That corpus (`packages/geg-parity`) has been removed now the
 * equivalence is established and exercised by live runs against real Python
 * keypers, which reject a mismatched credential outright.
 *
 * What remains is the local half: mint a credential, verify it with our own
 * verifier, and confirm the tamper and bounds cases behave. Self-consistent by
 * construction, so it cannot prove cross-language agreement — it guards the
 * minting path itself: key handling, hex conventions, field order at the call
 * site.
 */

import {
  initCurves,
  schnorrKeygen
} from '@shutter-network/urban-verified-crypto';
import {
  mintAttestation,
  resetIssuer,
  verifyAttestation
} from '../../../src/helpers/gegAttestation';

describe('verifyAttestation — the ingest self-check', () => {
  // The curve layer is process-wide and lazily initialised; the corpus block that
  // used to do this was removed with packages/geg-parity.
  beforeAll(async () => {
    await initCurves();
  });

  const ISSUER_SK =
    '0x0000000000000000000000000000000000000000000000000000000000002a2a';
  const electionId =
    '0x1111111111111111111111111111111111111111111111111111111111111111';
  const pseudonym =
    '0x2222222222222222222222222222222222222222222222222222222222222222';
  let vk: string;

  beforeAll(() => {
    process.env.TE_ELIGIBILITY_PRIVATE_KEY = ISSUER_SK;
    resetIssuer();
    const voter = schnorrKeygen(0x5151n);
    vk = `0x${Buffer.from(voter.vk.toBytes()).toString('hex')}`;
    voter.vk.destroyWasm();
  });

  const base = () => ({
    electionId,
    pseudonym,
    vk,
    weight: 7n,
    nonce: 1700000000n
  });

  it('accepts a credential it just minted', async () => {
    const args = base();
    const signature = await mintAttestation(args);
    await expect(verifyAttestation({ ...args, signature })).resolves.toBe(true);
  });

  // Every field is bound into the signed message, so changing any one of them
  // must break verification. A field that can be altered without detection is a
  // field the committee is not actually relying on.
  it.each([
    ['weight', { weight: 8n }],
    ['nonce', { nonce: 1700000001n }],
    [
      'electionId',
      {
        electionId:
          '0x3333333333333333333333333333333333333333333333333333333333333333'
      }
    ],
    [
      'pseudonym',
      {
        pseudonym:
          '0x4444444444444444444444444444444444444444444444444444444444444444'
      }
    ]
  ])('rejects when %s is altered after signing', async (_label, override) => {
    const args = base();
    const signature = await mintAttestation(args);
    await expect(
      verifyAttestation({
        ...args,
        ...override,
        signature
      })
    ).resolves.toBe(false);
  });

  // There is no upper bound left to enforce: the protocol's per-election
  // `maxWeight` is gone, so a large weight is simply a large weight. The lower
  // bound survives, and is what a malformed credential trips.
  it('accepts a validly signed weight of any size', async () => {
    const args = { ...base(), weight: 1_000_000_000n };
    const signature = await mintAttestation(args);
    await expect(verifyAttestation({ ...args, signature })).resolves.toBe(true);
  });

  // The lower bound is enforced where a credential is created, so it cannot be
  // reached through `verifyAttestation` with a genuinely minted one — asserting it
  // at the mint side is the reachable form of the same guarantee.
  it('refuses to mint a weight below 1', async () => {
    await expect(mintAttestation({ ...base(), weight: 0n })).rejects.toThrow(
      /weight must be >= 1/
    );
  });

  // Malformed input must return false rather than throw: this runs inside the
  // vote writer, where an exception and a rejection are handled differently.
  it.each([
    ['not hex', 'nonsense'],
    ['wrong length', '0xdeadbeef'],
    ['empty', '0x']
  ])('returns false for a %s signature', async (_label, signature) => {
    await expect(verifyAttestation({ ...base(), signature })).resolves.toBe(
      false
    );
  });

  it('rejects a signature from a different issuer', async () => {
    const args = base();
    const signature = await mintAttestation(args);
    process.env.TE_ELIGIBILITY_PRIVATE_KEY =
      '0x0000000000000000000000000000000000000000000000000000000000009999';
    resetIssuer();
    try {
      await expect(verifyAttestation({ ...args, signature })).resolves.toBe(
        false
      );
    } finally {
      process.env.TE_ELIGIBILITY_PRIVATE_KEY = ISSUER_SK;
      resetIssuer();
    }
  });
});
