import { GegDigestError } from './gegDigests';

function canonicalWeight(value: unknown): number {
  let weight: bigint;
  try {
    weight = BigInt(value as any);
  } catch {
    throw new GegDigestError(
      `totalAdmittedWeight: expected an integer (got ${value})`
    );
  }
  if (weight < 0n) {
    throw new GegDigestError('totalAdmittedWeight: must not be negative');
  }
  if (weight > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new GegDigestError(
      `totalAdmittedWeight: ${weight} exceeds the exactly-representable range; ` +
        'this body was parsed as a double and no longer matches what was signed'
    );
  }
  return Number(weight);
}

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
    throw new GegDigestError(`${label}: expected ${size} bytes of hex`);
  }
  return `0x${body.toLowerCase()}`;
}

export function canonicalAggregate(raw: any, electionId: string) {
  if (!raw || typeof raw !== 'object') {
    throw new GegDigestError('aggregate: expected an object');
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
        throw new GegDigestError(`admitted[${i}]: expected a sequence number`);
      }
      return seq;
    }
  );
  const exclusions = (Array.isArray(raw.exclusions) ? raw.exclusions : []).map(
    (x: any, i: number) => {
      if (!Number.isInteger(x?.sequenceNumber) || x.sequenceNumber < 0) {
        throw new GegDigestError(
          `exclusions[${i}].sequenceNumber: expected a sequence number`
        );
      }
      if (typeof x?.reason !== 'string') {
        throw new GegDigestError(`exclusions[${i}].reason: expected a string`);
      }
      return { sequenceNumber: x.sequenceNumber, reason: x.reason };
    }
  );
  const totalAdmittedWeight = canonicalWeight(raw.totalAdmittedWeight ?? 0);
  // Mirrors `geg.envelopes.codecs`, which reads `totalScaledWeight` and falls back
  // to `totalAdmittedWeight` when the field is absent. The fallback is what makes an
  // unscaled election (`scale = 1`, where the two are equal by construction) decode
  // identically on a payload written before the field existed. Defaulting to 0 here
  // instead would silently produce a different digest from the signer's.
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
