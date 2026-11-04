/**
 * Two aggregates with the same digest must be stored as the same text.
 *
 * The hub stores the envelope next to its digest and later picks one with
 * `MIN(aggregate_json)`, so differing text for one digest would make the served
 * JSON depend on that pick. `aggregateDigest` reads `totalAdmittedWeight` with
 * `BigInt(...)`, so `100` and `"100"` give the same digest and must be stored the
 * same way.
 */

import { stringifyPreservingBigInts } from '../../src/helpers/bigIntJson';
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
  // SGP's decoder (`envelopes/codecs.py:_int`) rejects anything but an int, so
  // the stored field must also be a JSON number, never a quoted one.
  it.each([
    ['number and string', 100, '100'],
    ['number and bigint-ish string', 4_294_967_296, '4294967296'],
    ['zero as number and string', 0, '0']
  ])('%s canonicalise identically, as a JSON number', (_label, a, b) => {
    const [ea, eb] = [envelope(a), envelope(b)];
    expect(digestOf(ea)).toBe(digestOf(eb));
    const stored = stringifyPreservingBigInts(canonicalAggregate(eb, ELECTION));
    expect(stringifyPreservingBigInts(canonicalAggregate(ea, ELECTION))).toBe(
      stored
    );
    expect(stored).toContain(`"totalAdmittedWeight":${a}`);
    expect(stored).not.toContain(`"${b}"`);
  });

  // Must match `shutter_governance_protocol.envelopes.codecs`: a missing weight
  // is zero, as in the digest, and a missing scaled weight falls back to the
  // admitted weight (not 0).
  it('defaults missing weights as the digest and SGP do', () => {
    const bare: any = envelope(undefined);
    delete bare.totalAdmittedWeight;
    expect(canonicalAggregate(bare, ELECTION).totalAdmittedWeight).toBe(0n);
    expect(digestOf({ ...bare, totalAdmittedWeight: 0 })).toBe(
      digestOf(envelope(0))
    );

    expect(canonicalAggregate(envelope(100), ELECTION).totalScaledWeight).toBe(
      100n
    );

    // An explicit scaled weight stays distinct from the admitted weight.
    const scaled: any = { ...envelope(100), totalScaledWeight: 50 };
    const c = canonicalAggregate(scaled, ELECTION);
    expect(c.totalScaledWeight).toBe(50n);
    expect(c.totalAdmittedWeight).toBe(100n);
    expect(digestOf(scaled)).not.toBe(digestOf(envelope(100)));
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
});
