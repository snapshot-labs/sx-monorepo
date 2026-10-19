/**
 * Digests that keypers and role keys sign over the content of their writes.
 *
 * They are defined by the Shutter governance protocol and must match its Solidity
 * and Python (SGP) byte for byte, so an unmodified keyper can write here and an
 * on-chain backend can `ecrecover` the same signatures. For example:
 *
 *   dkg-result = keccak256("SHUTTER-GOVERNANCE-PROTOCOL-DKG-RESULT-v1"
 *                          ‖ electionId ‖ pkElection
 *                          ‖ abi.encode(bytes[] committeePKs))
 *
 * Digests are signed as EIP-191 personal-sign messages. ABI encoding uses
 * `@ethersproject/abi`.
 */

import { defaultAbiCoder } from '@ethersproject/abi';
import { getAddress } from '@ethersproject/address';
import { keccak256 } from '@ethersproject/keccak256';
import { verifyMessage } from '@ethersproject/wallet';

const DKG_RESULT_DST = Buffer.from(
  'SHUTTER-GOVERNANCE-PROTOCOL-DKG-RESULT-v1',
  'utf8'
);
const AGGREGATE_DST = Buffer.from(
  'SHUTTER-GOVERNANCE-PROTOCOL-AGGREGATE-v1',
  'utf8'
);
const DECRYPT_SHARE_DST = Buffer.from(
  'SHUTTER-GOVERNANCE-PROTOCOL-DECRYPT-SHARE-v1',
  'utf8'
);
const RESULT_DST = Buffer.from('SHUTTER-GOVERNANCE-PROTOCOL-RESULT-v1', 'utf8');
const REQUEST_DST = Buffer.from(
  'SHUTTER-GOVERNANCE-PROTOCOL-REQUEST-v1',
  'utf8'
);

/**
 * Exclusion reason codes used in the digest. The wire format carries the name; the
 * digest carries its index in the protocol's declaration order, which this table
 * must match.
 */
const EXCLUSION_CODES: Record<string, number> = {
  INVALID_PROOF: 0,
  INVALID_SIGNATURE: 1,
  INVALID_ATTESTATION: 2,
  DUPLICATE_PSEUDONYM: 3,
  MALFORMED: 4,
  OUT_OF_WINDOW: 5
};

export class SgpDigestError extends Error {}

/** Decodes hex of exactly `size` bytes, so a wrong length cannot shift the digest. */
function decodeSized(value: unknown, label: string, size: number): Buffer {
  if (typeof value !== 'string') {
    throw new SgpDigestError(`${label}: not a string`);
  }
  const body =
    value.startsWith('0x') || value.startsWith('0X') ? value.slice(2) : value;
  if (!/^[0-9a-fA-F]*$/.test(body)) {
    throw new SgpDigestError(`${label}: not hex`);
  }
  if (body.length !== size * 2) {
    throw new SgpDigestError(
      `${label}: expected ${size} bytes, got ${body.length / 2}`
    );
  }
  return Buffer.from(body, 'hex');
}

/**
 * The digest a keyper signs over its DKG result.
 *
 * `electionId` is the 32-byte proposal id, `pkElection` the 96-byte compressed
 * joint public key, and `committeePKs` the keyper public keys in committee order.
 */
export function dkgResultDigest(args: {
  electionId: string;
  pkElection: string;
  committeePKs: string[];
}): Buffer {
  const electionId = decodeSized(args.electionId, 'electionId', 32);
  const pkElection = decodeSized(args.pkElection, 'pkElection', 96);
  if (!Array.isArray(args.committeePKs) || args.committeePKs.length === 0) {
    throw new SgpDigestError('committeePKs: expected a non-empty array');
  }
  const committeePKs = args.committeePKs.map((pk, i) =>
    decodeSized(pk, `committeePKs[${i}]`, 96)
  );

  const encoded = Buffer.from(
    defaultAbiCoder.encode(['bytes[]'], [committeePKs]).slice(2),
    'hex'
  );
  const packed = Buffer.concat([
    DKG_RESULT_DST,
    electionId,
    pkElection,
    encoded
  ]);
  return Buffer.from(keccak256(packed).slice(2), 'hex');
}

/** One `(c1, c2)` ciphertext pair of the aggregate, compressed G2 points. */
export interface SgpAggregateCiphertext {
  c1: string;
  c2: string;
}

/** A ballot the committee left out, and why. */
export interface SgpExclusion {
  sequenceNumber: number;
  reason: string;
}

/**
 * The digest a keyper signs over its aggregate.
 *
 * A single ABI encode of the tuple
 * `((bytes,bytes)[], uint256[], (uint256,uint8)[], uint256, uint256)`: ciphertext
 * pairs, admitted sequence numbers, exclusions as `(sequenceNumber, reasonCode)`,
 * total admitted weight and total scaled weight.
 *
 * The admitted set is signed, so keypers that counted different ballots never
 * reach quorum.
 *
 * Must match `shutter_governance_protocol.core.write_auth._TALLY_ABI` field for
 * field. A mismatch does not error: every keyper recovers to a wrong address and
 * is rejected as a non-member (403). Change both in the same release.
 */
export function aggregateDigest(args: {
  electionId: string;
  aggregates: SgpAggregateCiphertext[];
  admitted: number[];
  exclusions: SgpExclusion[];
  totalAdmittedWeight: number | string | bigint;
  totalScaledWeight: number | string | bigint;
}): Buffer {
  const electionId = decodeSized(args.electionId, 'electionId', 32);
  if (!Array.isArray(args.aggregates)) {
    throw new SgpDigestError('aggregates: expected an array');
  }
  if (!Array.isArray(args.admitted)) {
    throw new SgpDigestError('admitted: expected an array');
  }
  if (!Array.isArray(args.exclusions)) {
    throw new SgpDigestError('exclusions: expected an array');
  }

  const pairs = args.aggregates.map((ct, i) => [
    decodeSized(ct?.c1, `aggregates[${i}].c1`, 96),
    decodeSized(ct?.c2, `aggregates[${i}].c2`, 96)
  ]);
  const admitted = args.admitted.map((seq, i) => {
    if (!Number.isInteger(seq) || seq < 0) {
      throw new SgpDigestError(`admitted[${i}]: expected a sequence number`);
    }
    return seq;
  });
  const exclusions = args.exclusions.map((x, i) => {
    const code = EXCLUSION_CODES[x?.reason as string];
    if (code === undefined) {
      throw new SgpDigestError(`exclusions[${i}].reason: unknown ${x?.reason}`);
    }
    if (!Number.isInteger(x?.sequenceNumber) || x.sequenceNumber < 0) {
      throw new SgpDigestError(
        `exclusions[${i}].sequenceNumber: expected a sequence number`
      );
    }
    return [x.sequenceNumber, code];
  });

  // Passed as a decimal string: the ABI coder rejects JS numbers at or above
  // 2^53-1, and a sum of weights can get there.
  const weightField = (
    value: number | string | bigint,
    name: string
  ): string => {
    let out: string;
    try {
      out = BigInt(value).toString();
    } catch {
      throw new SgpDigestError(`${name}: expected an integer (got ${value})`);
    }
    if (out.startsWith('-')) {
      throw new SgpDigestError(`${name}: must not be negative`);
    }
    return out;
  };
  const totalAdmittedWeight = weightField(
    args.totalAdmittedWeight,
    'totalAdmittedWeight'
  );
  const totalScaledWeight = weightField(
    args.totalScaledWeight,
    'totalScaledWeight'
  );

  const encoded = Buffer.from(
    defaultAbiCoder
      .encode(
        [
          'tuple(tuple(bytes,bytes)[],uint256[],tuple(uint256,uint8)[],uint256,uint256)'
        ],
        [[pairs, admitted, exclusions, totalAdmittedWeight, totalScaledWeight]]
      )
      .slice(2),
    'hex'
  );
  const packed = Buffer.concat([AGGREGATE_DST, electionId, encoded]);
  return Buffer.from(keccak256(packed).slice(2), 'hex');
}

/** One keyper's partial decryption of one candidate. */
export interface SgpShareEntry {
  /** 96-byte compressed G2 point. */
  sigma: string;
  /** 64-byte DLEQ proof: `e ‖ z`, two 32-byte big-endian scalars. */
  proof: string;
}

/**
 * The digest a keyper signs over its decryption shares.
 *
 * Two separate ABI encodes, concatenated: sigmas as `bytes[]`, then proofs as
 * `(uint256,uint256)[]`. One encode of both would add a tuple header and give a
 * different digest. Each 64-byte proof is split into its two scalars.
 */
export function decryptionShareDigest(args: {
  electionId: string;
  entries: SgpShareEntry[];
}): Buffer {
  const electionId = decodeSized(args.electionId, 'electionId', 32);
  if (!Array.isArray(args.entries) || args.entries.length === 0) {
    throw new SgpDigestError('entries: expected a non-empty array');
  }

  const sigmas = args.entries.map((e, i) =>
    decodeSized(e?.sigma, `entries[${i}].sigma`, 96)
  );
  const proofs = args.entries.map((e, i) => {
    const proof = decodeSized(e?.proof, `entries[${i}].proof`, 64);
    return [
      `0x${proof.subarray(0, 32).toString('hex')}`,
      `0x${proof.subarray(32).toString('hex')}`
    ];
  });

  const packed = Buffer.concat([
    DECRYPT_SHARE_DST,
    electionId,
    Buffer.from(defaultAbiCoder.encode(['bytes[]'], [sigmas]).slice(2), 'hex'),
    Buffer.from(
      defaultAbiCoder.encode(['tuple(uint256,uint256)[]'], [proofs]).slice(2),
      'hex'
    )
  ]);
  return Buffer.from(keccak256(packed).slice(2), 'hex');
}

/**
 * The digest the result publisher signs over a published result.
 *
 * Covers the per-candidate totals, the keyper indices that decrypted them, and the
 * BSGS bound, so a signature cannot be reused for different totals. Values go
 * through `BigInt` because totals can exceed 2^53.
 */
export function resultDigest(args: {
  electionId: string;
  totals: Array<number | string | bigint>;
  keyperIndices: Array<number | string>;
  bsgsBound: number | string | bigint;
}): Buffer {
  const electionId = decodeSized(args.electionId, 'electionId', 32);
  if (!Array.isArray(args.totals) || args.totals.length === 0) {
    throw new SgpDigestError('totals: expected a non-empty array');
  }
  if (!Array.isArray(args.keyperIndices) || args.keyperIndices.length === 0) {
    throw new SgpDigestError('keyperIndices: expected a non-empty array');
  }

  const asUint = (value: unknown, label: string): string => {
    let n: bigint;
    try {
      n = BigInt(value as any);
    } catch {
      throw new SgpDigestError(`${label}: expected an integer (got ${value})`);
    }
    if (n < 0n) throw new SgpDigestError(`${label}: must not be negative`);
    return n.toString();
  };

  const encoded = Buffer.from(
    defaultAbiCoder
      .encode(
        ['uint256[]', 'uint256[]', 'uint256'],
        [
          args.totals.map((t, i) => asUint(t, `totals[${i}]`)),
          args.keyperIndices.map((k, i) => asUint(k, `keyperIndices[${i}]`)),
          asUint(args.bsgsBound, 'bsgsBound')
        ]
      )
      .slice(2),
    'hex'
  );
  return Buffer.from(
    keccak256(Buffer.concat([RESULT_DST, electionId, encoded])).slice(2),
    'hex'
  );
}

/**
 * `requestDigest` is what role keys sign for a named operation (publish result,
 * stall tally, resume tally); the signature covers this wrapper, not the artifact
 * digest directly. Each field is length-prefixed (`u32BE(len) ‖ bytes`) so field
 * boundaries cannot shift.
 *
 * `payload` is empty when (op, election) says it all, as for stall and resume. A
 * result's payload is `resultDigest(...)`, so the signature is tied to its totals.
 */

export function requestNoncePayload(issuedAt: number): Buffer {
  if (!Number.isInteger(issuedAt) || issuedAt < 0) {
    throw new SgpDigestError(
      `issuedAt must be a non-negative integer, got ${issuedAt}`
    );
  }
  const b = Buffer.alloc(8);
  b.writeBigUInt64BE(BigInt(issuedAt), 0);
  return b;
}

export function requestDigest(
  op: string,
  electionId: string,
  payload: Buffer = Buffer.alloc(0)
): Buffer {
  const eid = decodeSized(electionId, 'electionId', 32);
  const opBytes = Buffer.from(op, 'utf8');
  const u32BE = (n: number) => {
    const b = Buffer.alloc(4);
    b.writeUInt32BE(n, 0);
    return b;
  };
  const packed = Buffer.concat([
    REQUEST_DST,
    u32BE(opBytes.length),
    opBytes,
    u32BE(eid.length),
    eid,
    u32BE(payload.length),
    payload
  ]);
  return Buffer.from(keccak256(packed).slice(2), 'hex');
}

/**
 * Recovers the EIP-191 signer of a digest, checksummed. Returns `null` for a
 * malformed signature, so callers can treat it the same as a wrong signer.
 */
export function recoverDigestSigner(
  digest: Buffer,
  signature: string
): string | null {
  try {
    return getAddress(verifyMessage(digest, signature));
  } catch {
    return null;
  }
}
