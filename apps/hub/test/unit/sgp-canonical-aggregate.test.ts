/**
 * The stored aggregate envelope must be a function of the digest.
 *
 * Two keypers that derived the same tally sign the same digest, and the hub
 * counts those signatures toward the quorum. But the *envelope* is stored beside
 * the digest and later resolved with `MIN(aggregate_json)` — a lexicographic
 * pick — so if two submissions can share a digest while differing as text, the
 * JSON served to the committee and to auditors stops being determined by the
 * artifact they agreed on, and `proposals.te_aggregate` may not match what any
 * particular keyper signed.
 *
 * `aggregateDigest` coerces `totalAdmittedWeight` through `BigInt(...)`, so `100`
 * and `"100"` are the same digest; `canonicalAggregate` used to keep whichever
 * form arrived. That is finding L-5, and it was the last such field: points are
 * lowercased by `canonicalPoint`, `admitted` is validated to integers, and
 * exclusion reasons are already canonical because the digest rejects any string
 * outside `EXCLUSION_CODES`.
 *
 * The property under test is therefore stated directly: **equal digest implies
 * equal stored text.** Asserting the two together is what makes this meaningful —
 * a test that only checked the field's type would pass against a canonicaliser
 * that normalised it to something the digest disagreed with.
 */

import {
  parseJsonPreservingBigInts,
  stringifyPreservingBigInts
} from '../../src/helpers/bigIntJson';
import { canonicalAggregate } from '../../src/helpers/sgpAggregate';
import { aggregateDigest, SgpDigestError } from '../../src/helpers/sgpDigests';

const ELECTION = `0x${'11'.repeat(32)}`;
const P96 = `0x${'ab'.repeat(96)}`;

function envelope(totalAdmittedWeight: unknown) {
  return {
    aggregates: [{ c1: P96, c2: P96 }],
    admitted: [0, 1],
    exclusions: [{ sequenceNumber: 2, reason: 'INVALID_PROOF' }],
    totalAdmittedWeight
  };
}

const digestOf = (env: any) =>
  aggregateDigest({
    electionId: ELECTION,
    aggregates: env.aggregates,
    admitted: env.admitted,
    exclusions: env.exclusions,
    totalAdmittedWeight: env.totalAdmittedWeight,
    totalScaledWeight: env.totalScaledWeight ?? env.totalAdmittedWeight
  }).toString('hex');

describe('canonicalAggregate: equal digest implies equal stored text', () => {
  // The regression: the same weight in the two forms a client may send it.
  it.each([
    ['number and string', 100, '100'],
    ['number and bigint-ish string', 4_294_967_296, '4294967296'],
    ['zero as number and string', 0, '0']
  ])('%s canonicalise identically', (_label, a, b) => {
    const [ea, eb] = [envelope(a), envelope(b)];
    // Same digest — this is the premise, not the conclusion. If it ever stops
    // holding, the two are genuinely different artifacts and MIN() is moot.
    expect(digestOf(ea)).toBe(digestOf(eb));
    expect(stringifyPreservingBigInts(canonicalAggregate(ea, ELECTION))).toBe(
      stringifyPreservingBigInts(canonicalAggregate(eb, ELECTION))
    );
  });

  // Not a string. SGP's own decoder (`envelopes/codecs.py:_int`) rejects
  // anything that is not a Python int, so quoting this field would fail every
  // aggregate read and the committee could not build decryption shares.
  it('keeps the field a JSON number, which the protocol decoder requires', () => {
    const stored = stringifyPreservingBigInts(
      canonicalAggregate(envelope('100'), ELECTION)
    );
    expect(stored).toContain('"totalAdmittedWeight":100');
    expect(stored).not.toContain('"100"');
  });

  it('defaults a missing weight to zero, as the digest does', () => {
    const bare: any = envelope(undefined);
    delete bare.totalAdmittedWeight;
    expect(canonicalAggregate(bare, ELECTION).totalAdmittedWeight).toBe(0n);
    expect(digestOf({ ...bare, totalAdmittedWeight: 0 })).toBe(
      digestOf(envelope(0))
    );
  });

  // Mirrors `shutter_governance_protocol.envelopes.codecs`, which reads
  // totalScaledWeight and falls back to totalAdmittedWeight rather than to 0. On an
  // unscaled election the two are equal by construction, so the fallback is what
  // lets a payload written before the field existed hash to the same digest.
  // Defaulting to 0 would be a silent fork.
  it('defaults a missing scaled weight to the admitted weight, as SGP does', () => {
    const c = canonicalAggregate(envelope(100), ELECTION);
    expect(c.totalScaledWeight).toBe(100n);
  });

  it('keeps an explicit scaled weight distinct from the admitted weight', () => {
    const scaled: any = { ...envelope(100), totalScaledWeight: 50 };
    const c = canonicalAggregate(scaled, ELECTION);
    expect(c.totalScaledWeight).toBe(50n);
    expect(c.totalAdmittedWeight).toBe(100n);
    expect(digestOf(scaled)).not.toBe(digestOf(envelope(100)));
  });

  // Different weights must stay different — a canonicaliser that collapsed
  // everything to one value would pass every test above.
  it('does not collapse distinct weights', () => {
    expect(canonicalAggregate(envelope(100), ELECTION)).not.toEqual(
      canonicalAggregate(envelope(101), ELECTION)
    );
  });

  it.each([
    ['negative', -1],
    ['fractional', 1.5],
    ['not a number at all', 'abc']
  ])('refuses a %s weight rather than storing it', (_label, value) => {
    expect(() => canonicalAggregate(envelope(value), ELECTION)).toThrow(
      SgpDigestError
    );
  });

  // A sum of raw voting power passes 2^53 on large-supply tokens. 2^54 + 1 is not
  // representable as a double, so this only passes if nothing on the way rounds it:
  // read from raw text, canonicalised, stored, and read back.
  it('keeps a weight past 2^53 exact, from raw text to stored text', () => {
    const weight = 2n ** 54n + 1n;
    const raw = `{"aggregate":${stringifyPreservingBigInts(envelope(weight))}}`;
    expect(raw).toContain(`"totalAdmittedWeight":${weight}`);

    const c = canonicalAggregate(
      parseJsonPreservingBigInts(raw).aggregate,
      ELECTION
    );
    expect(c.totalAdmittedWeight).toBe(weight);
    expect(digestOf(c)).toBe(digestOf(envelope(weight)));
    expect(stringifyPreservingBigInts(c)).toContain(
      `"totalAdmittedWeight":${weight}`
    );
  });
});
