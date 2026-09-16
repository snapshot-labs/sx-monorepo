/**
 * Cross-language parity for the aggregate write digest.
 *
 * Same contract as the DKG digest, one layer harder: this one ABI-encodes a
 * *nested* tuple — `((bytes,bytes)[], uint256[], (uint256,uint8)[], uint256, uint256)` —
 * as a single value rather than four field-wise encodes. Dynamic arrays of
 * dynamic elements are laid out as an offset table followed by padded data, so
 * a plausible-looking hand-rolled encoding produces a plausible-looking digest
 * that simply never matches a keyper's.
 *
 * The consequence of drift is specific and quiet: every aggregate submission
 * fails signature recovery, no quorum ever forms, and the election sits in
 * `Tallying` until the coordinator gives up. Nothing says "encoding".
 *
 * So the vectors come from geg's own `write_auth.aggregate_digest`, with
 * signatures over them, in `test/fixtures/geg-aggregate-digests.json`.
 * Regenerate with geg's venv after any change to the digest definition.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  aggregateDigest,
  EXCLUSION_CODES,
  GegDigestError,
  recoverDigestSigner
} from '../../src/helpers/gegDigests';

type AggregateCase = {
  name: string;
  electionId: string;
  aggregate: {
    electionId: string;
    aggregates: Array<{ c1: string; c2: string }>;
    admitted: number[];
    exclusions: Array<{ sequenceNumber: number; reason: string }>;
    totalAdmittedWeight: number;
    totalScaledWeight: number;
  };
  digest: string;
  signature: string;
  signer: string;
};

const fixture: { cases: AggregateCase[] } = JSON.parse(
  readFileSync(
    join(__dirname, '../fixtures/geg-aggregate-digests.json'),
    'utf8'
  )
);

function digestOf(c: AggregateCase): string {
  return `0x${aggregateDigest({
    electionId: c.electionId,
    aggregates: c.aggregate.aggregates,
    admitted: c.aggregate.admitted,
    exclusions: c.aggregate.exclusions,
    totalAdmittedWeight: c.aggregate.totalAdmittedWeight,
    totalScaledWeight: c.aggregate.totalScaledWeight
  }).toString('hex')}`;
}

describe('GEG-AGGREGATE-v1 digest', () => {
  it('has vectors spanning the shapes the ABI layout differs on', () => {
    const names = fixture.cases.map(c => c.name);
    expect(names).toEqual(
      expect.arrayContaining(['empty_election', 'every_exclusion_reason'])
    );
    expect(fixture.cases.length).toBeGreaterThanOrEqual(4);
  });

  it.each(fixture.cases.map(c => [c.name, c] as const))(
    'reproduces the Python digest for %s',
    (_name, c) => {
      expect(digestOf(c)).toBe(c.digest);
    }
  );

  it.each(fixture.cases.map(c => [c.name, c] as const))(
    'recovers the Python signer for %s',
    (_name, c) => {
      expect(
        recoverDigestSigner(Buffer.from(c.digest.slice(2), 'hex'), c.signature)
      ).toBe(c.signer);
    }
  );

  // Each of these is a way two keypers could agree on the ciphertexts and still
  // be describing different tallies. The digest has to separate them, or a
  // quorum could form over an aggregate the committee did not actually agree on.
  describe('binds every field, not just the ciphertexts', () => {
    const base = fixture.cases[0];

    it('binds the admitted set', () => {
      const changed = {
        ...base,
        aggregate: { ...base.aggregate, admitted: [0, 2, 6] }
      };
      expect(digestOf(changed)).not.toBe(base.digest);
    });

    it('binds the admitted order', () => {
      const changed = {
        ...base,
        aggregate: {
          ...base.aggregate,
          admitted: [...base.aggregate.admitted].reverse()
        }
      };
      expect(digestOf(changed)).not.toBe(base.digest);
    });

    it('binds the exclusion reason, not only which ballot was excluded', () => {
      const changed = {
        ...base,
        aggregate: {
          ...base.aggregate,
          exclusions: base.aggregate.exclusions.map((x, i) =>
            i === 0 ? { ...x, reason: 'MALFORMED' } : x
          )
        }
      };
      expect(digestOf(changed)).not.toBe(base.digest);
    });

    it('binds the total admitted weight', () => {
      const changed = {
        ...base,
        aggregate: { ...base.aggregate, totalAdmittedWeight: 1235 }
      };
      expect(digestOf(changed)).not.toBe(base.digest);
    });

    // The field whose absence caused every keyper's aggregate to be rejected as
    // "from non-member": geg signed five fields, the hub hashed four, and recovery
    // returned a valid-looking address belonging to nobody. The fixture keeps
    // totalScaledWeight != totalAdmittedWeight here so dropping it cannot coincide.
    it('binds the total scaled weight', () => {
      const changed = {
        ...base,
        aggregate: {
          ...base.aggregate,
          totalScaledWeight: base.aggregate.totalScaledWeight + 1
        }
      };
      expect(digestOf(changed)).not.toBe(base.digest);
    });

    it('binds the ciphertexts', () => {
      const changed = {
        ...base,
        aggregate: {
          ...base.aggregate,
          aggregates: base.aggregate.aggregates.map((ct, i) =>
            i === 0 ? { ...ct, c2: `0x${'ee'.repeat(96)}` } : ct
          )
        }
      };
      expect(digestOf(changed)).not.toBe(base.digest);
    });
  });

  describe('rejects malformed input rather than digesting it', () => {
    const base = fixture.cases[0];

    it('rejects an unknown exclusion reason', () => {
      expect(() =>
        aggregateDigest({
          ...base.aggregate,
          electionId: base.electionId,
          exclusions: [{ sequenceNumber: 0, reason: 'NOT_A_REASON' }]
        })
      ).toThrow(GegDigestError);
    });

    it('rejects a wrong-sized ciphertext', () => {
      expect(() =>
        aggregateDigest({
          ...base.aggregate,
          electionId: base.electionId,
          aggregates: [{ c1: '0xdead', c2: `0x${'bb'.repeat(96)}` }]
        })
      ).toThrow(GegDigestError);
    });

    it('rejects a negative sequence number', () => {
      expect(() =>
        aggregateDigest({
          ...base.aggregate,
          electionId: base.electionId,
          admitted: [-1]
        })
      ).toThrow(GegDigestError);
    });
  });

  // The wire envelope carries the reason as a name; the digest carries its
  // declaration index. A reordering here is undetectable except as a digest
  // mismatch on elections that excluded a ballot.
  it('codes exclusion reasons in the protocol declaration order', () => {
    expect(EXCLUSION_CODES).toEqual({
      INVALID_PROOF: 0,
      INVALID_SIGNATURE: 1,
      INVALID_ATTESTATION: 2,
      DUPLICATE_PSEUDONYM: 3,
      MALFORMED: 4,
      OUT_OF_WINDOW: 5
    });
  });
});
