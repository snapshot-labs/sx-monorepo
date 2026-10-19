import { SgpDigestError } from './sgpDigests';

/**
 * Kept as a `bigint`: a sum of raw voting power passes 2^53 on large-supply
 * tokens, and the keyper's signature covers the exact integer.
 */
function canonicalWeight(value: unknown): bigint {
  let weight: bigint;
  try {
    weight = BigInt(value as any);
  } catch {
    throw new SgpDigestError(
      `totalAdmittedWeight: expected an integer (got ${value})`
    );
  }
  if (weight < 0n) {
    throw new SgpDigestError('totalAdmittedWeight: must not be negative');
  }
  return weight;
}

/**
 * Normalise a compressed point to lowercase `0x` hex.
 *
 * The quorum rule counts *byte-identical* submissions, so the stored form has to
 * be canonical. Two keypers that agree on the key but disagree on capitalisation
 * would otherwise never reach quorum, and the failure would look like disagreement
 * rather than formatting.
 */
export function canonicalPoint(
  value: unknown,
  label: string,
  size: number
): string {
  const body =
    typeof value === 'string' &&
    (value.startsWith('0x') || value.startsWith('0X'))
      ? value.slice(2)
      : value;
  if (
    typeof body !== 'string' ||
    body.length !== size * 2 ||
    !/^[0-9a-fA-F]*$/.test(body)
  ) {
    throw new SgpDigestError(`${label}: expected ${size} bytes of hex`);
  }
  return `0x${body.toLowerCase()}`;
}

export function canonicalAggregate(raw: any, electionId: string) {
  if (!raw || typeof raw !== 'object') {
    throw new SgpDigestError('aggregate: expected an object');
  }
  const aggregates = (Array.isArray(raw.aggregates) ? raw.aggregates : []).map(
    (ct: any, i: number) => ({
      c1: canonicalPoint(ct?.c1, `aggregates[${i}].c1`, 96),
      c2: canonicalPoint(ct?.c2, `aggregates[${i}].c2`, 96)
    })
  );
  const admitted = (Array.isArray(raw.admitted) ? raw.admitted : []).map(
    (seq: any, i: number) => {
      if (!Number.isInteger(seq) || seq < 0) {
        throw new SgpDigestError(`admitted[${i}]: expected a sequence number`);
      }
      return seq;
    }
  );
  const exclusions = (Array.isArray(raw.exclusions) ? raw.exclusions : []).map(
    (x: any, i: number) => {
      if (!Number.isInteger(x?.sequenceNumber) || x.sequenceNumber < 0) {
        throw new SgpDigestError(
          `exclusions[${i}].sequenceNumber: expected a sequence number`
        );
      }
      if (typeof x?.reason !== 'string') {
        throw new SgpDigestError(`exclusions[${i}].reason: expected a string`);
      }
      return { sequenceNumber: x.sequenceNumber, reason: x.reason };
    }
  );
  const totalAdmittedWeight = canonicalWeight(raw.totalAdmittedWeight ?? 0);
  // Mirrors `shutter_governance_protocol.envelopes.codecs`, which reads
  // `totalScaledWeight` and falls back to `totalAdmittedWeight` when the field is
  // absent. The fallback is what makes an unscaled election (`scale = 1`, where the
  // two are equal by construction) decode identically on a payload written before
  // the field existed. Defaulting to 0 here instead would silently produce a
  // different digest from the signer's.
  const totalScaledWeight = canonicalWeight(
    raw.totalScaledWeight ?? raw.totalAdmittedWeight ?? 0
  );

  return {
    electionId,
    aggregates,
    admitted,
    exclusions,
    totalAdmittedWeight,
    totalScaledWeight
  };
}
