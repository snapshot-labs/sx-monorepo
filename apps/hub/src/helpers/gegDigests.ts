/**
 * Content-binding write digests for keyper submissions.
 *
 * A keyper signs the *content* of its write, not a generic request. That is what
 * lets the same signature be verified identically by any backend: this hub
 * recovers the signer and checks committee membership, while an on-chain backend
 * relays the same signature to a contract that `ecrecover`s the same digest. The
 * digests therefore mirror the Solidity byte-for-byte and are not ours to change —
 * they are the protocol's, and geg's Python computes them from the same definition.
 *
 *   dkg-result = keccak256("GEG-DKG-RESULT-v1" ‖ electionId ‖ pkElection
 *                          ‖ abi.encode(bytes[] committeePKs))
 *
 * Signed as an EIP-191 personal-sign message, so plain `ecrecover` and OpenZeppelin's
 * ECDSA helper agree on the recovered address.
 *
 * These replace the previous `SX-TE-*` digests. The difference is not cosmetic: the
 * old ones were an sx invention that only this hub understood, so a keyper had to be
 * built specifically for Snapshot. Adopting the protocol's digests is what allows an
 * unmodified keyper — one that knows nothing about Snapshot — to write here.
 *
 * ABI encoding is delegated to `@ethersproject/abi` rather than hand-rolled. The
 * offset arithmetic for a dynamic array of dynamic elements is easy to get subtly
 * wrong, and the aggregate digest that follows in a later phase encodes a nested
 * struct with several dynamic members. Parity with the Python side is pinned by
 * `test/unit/geg-digests.test.ts` against generated vectors.
 */

import { defaultAbiCoder } from '@ethersproject/abi';
import { getAddress } from '@ethersproject/address';
import { keccak256 } from '@ethersproject/keccak256';
import { verifyMessage } from '@ethersproject/wallet';

const DKG_RESULT_DST = Buffer.from('GEG-DKG-RESULT-v1', 'utf8');
const AGGREGATE_DST = Buffer.from('GEG-AGGREGATE-v1', 'utf8');
const DECRYPT_SHARE_DST = Buffer.from('GEG-DECRYPT-SHARE-v1', 'utf8');
const RESULT_DST = Buffer.from('GEG-RESULT-v1', 'utf8');
const REQUEST_DST = Buffer.from('GEG-REQUEST-v1', 'utf8');

/**
 * Exclusion reasons as the digest encodes them: the protocol's **declaration
 * order**, not the string.
 *
 * The wire envelope carries the name (`"INVALID_PROOF"`), the digest carries the
 * index. Getting this table wrong produces a digest that differs from the
 * keyper's for exactly the ballots that were excluded — so an election with no
 * exclusions would verify fine and one with a single bad ballot would fail
 * authorisation with no obvious link to the cause.
 */
export const EXCLUSION_CODES: Record<string, number> = {
  INVALID_PROOF: 0,
  INVALID_SIGNATURE: 1,
  INVALID_ATTESTATION: 2,
  DUPLICATE_PSEUDONYM: 3,
  MALFORMED: 4,
  OUT_OF_WINDOW: 5
};

export class GegDigestError extends Error {}

/** Strict fixed-size hex decode. A wrong length here would silently shift the digest. */
function decodeSized(value: unknown, label: string, size: number): Buffer {
  if (typeof value !== 'string') {
    throw new GegDigestError(`${label}: not a string`);
  }
  const body =
    value.startsWith('0x') || value.startsWith('0X') ? value.slice(2) : value;
  if (!/^[0-9a-fA-F]*$/.test(body)) {
    throw new GegDigestError(`${label}: not hex`);
  }
  if (body.length !== size * 2) {
    throw new GegDigestError(
      `${label}: expected ${size} bytes, got ${body.length / 2}`
    );
  }
  return Buffer.from(body, 'hex');
}

/**
 * The digest a keyper signs over its DKG result.
 *
 * `electionId` is the 32-byte election identifier — the proposal id. `pkElection`
 * is the 96-byte compressed joint public key, and `committeePKs` are the per-keyper
 * public keys in committee-index order.
 */
export function dkgResultDigest(args: {
  electionId: string;
  pkElection: string;
  committeePKs: string[];
}): Buffer {
  const electionId = decodeSized(args.electionId, 'electionId', 32);
  const pkElection = decodeSized(args.pkElection, 'pkElection', 96);
  if (!Array.isArray(args.committeePKs) || args.committeePKs.length === 0) {
    throw new GegDigestError('committeePKs: expected a non-empty array');
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
export interface GegAggregateCiphertext {
  c1: string;
  c2: string;
}

/** A ballot the committee left out, and why. */
export interface GegExclusion {
  sequenceNumber: number;
  reason: string;
}

/**
 * The digest a keyper signs over its aggregate.
 *
 * One ABI encode of the whole nested tuple
 * `((bytes,bytes)[], uint256[], (uint256,uint8)[], uint256, uint256)` — the
 * ciphertext pairs, the admitted sequence numbers, the exclusions as
 * `(sequenceNumber, reasonCode)`, the total admitted weight, and the total
 * *scaled* weight — not five field-wise encodes.
 *
 * The admitted set is *part of what is signed*, which is the point of the
 * committee-owned aggregate: two keypers that summed the same ciphertexts over a
 * different set of ballots produce different digests and never reach a quorum.
 *
 * **This tuple must match `geg.core.write_auth._TALLY_ABI` field for field.** It is
 * the second implementation of one signed format, and the two are only ever checked
 * against each other by the parity vectors. When weight scaling added the trailing
 * `totalScaledWeight`, geg was updated and this was not: keypers signed five fields,
 * the hub hashed four, and `ecrecover` returned a well-formed but wrong address for
 * every keyper. The hub reported it as `aggregate from non-member 0x…` and returned
 * 403 — a message that points at the committee roster, which was correct, and says
 * nothing about the digest, which was not. A shape change here is a wire-format
 * change: bump the parity vectors in the same commit.
 */
export function aggregateDigest(args: {
  electionId: string;
  aggregates: GegAggregateCiphertext[];
  admitted: number[];
  exclusions: GegExclusion[];
  totalAdmittedWeight: number | string | bigint;
  totalScaledWeight: number | string | bigint;
}): Buffer {
  const electionId = decodeSized(args.electionId, 'electionId', 32);
  if (!Array.isArray(args.aggregates)) {
    throw new GegDigestError('aggregates: expected an array');
  }
  if (!Array.isArray(args.admitted)) {
    throw new GegDigestError('admitted: expected an array');
  }
  if (!Array.isArray(args.exclusions)) {
    throw new GegDigestError('exclusions: expected an array');
  }

  const pairs = args.aggregates.map((ct, i) => [
    decodeSized(ct?.c1, `aggregates[${i}].c1`, 96),
    decodeSized(ct?.c2, `aggregates[${i}].c2`, 96)
  ]);
  const admitted = args.admitted.map((seq, i) => {
    if (!Number.isInteger(seq) || seq < 0) {
      throw new GegDigestError(`admitted[${i}]: expected a sequence number`);
    }
    return seq;
  });
  const exclusions = args.exclusions.map((x, i) => {
    const code = EXCLUSION_CODES[x?.reason as string];
    if (code === undefined) {
      throw new GegDigestError(`exclusions[${i}].reason: unknown ${x?.reason}`);
    }
    if (!Number.isInteger(x?.sequenceNumber) || x.sequenceNumber < 0) {
      throw new GegDigestError(
        `exclusions[${i}].sequenceNumber: expected a sequence number`
      );
    }
    return [x.sequenceNumber, code];
  });

  // As a decimal string, not a JS number: the ABI coder refuses a number at or
  // above 2^53-1, and this field is a sum of weights — with the weight ceiling
  // at 1e6 a large electorate reaches that range legitimately. A digest that
  // throws for big elections and works for small ones is the worst shape of bug,
  // so the value never becomes a float on the way in.
  const weightField = (
    value: number | string | bigint,
    name: string
  ): string => {
    let out: string;
    try {
      out = BigInt(value).toString();
    } catch {
      throw new GegDigestError(`${name}: expected an integer (got ${value})`);
    }
    if (out.startsWith('-')) {
      throw new GegDigestError(`${name}: must not be negative`);
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

/**
 * The digest as it was *before* weight scaling added `totalScaledWeight`.
 *
 * Diagnostic only — never accept a signature over this. Its one job is to turn a
 * wire-format mismatch into a message that names the mismatch. Recovery against the
 * wrong tuple shape does not fail; it returns a perfectly well-formed address that
 * happens to belong to nobody, so the only symptom is "not a registered keyper" and
 * every obvious explanation (wrong keys, stale roster, unregistered keyper) is
 * wrong. Checking the old shape on the failure path costs one keccak and answers
 * the question directly.
 */
export function aggregateDigestPreScale(args: {
  electionId: string;
  aggregates: GegAggregateCiphertext[];
  admitted: number[];
  exclusions: GegExclusion[];
  totalAdmittedWeight: number | string | bigint;
}): Buffer {
  const electionId = decodeSized(args.electionId, 'electionId', 32);
  const pairs = args.aggregates.map((ct, i) => [
    decodeSized(ct?.c1, `aggregates[${i}].c1`, 96),
    decodeSized(ct?.c2, `aggregates[${i}].c2`, 96)
  ]);
  const exclusions = args.exclusions.map(x => [
    x.sequenceNumber,
    EXCLUSION_CODES[x.reason as string]
  ]);
  const encoded = Buffer.from(
    defaultAbiCoder
      .encode(
        [
          'tuple(tuple(bytes,bytes)[],uint256[],tuple(uint256,uint8)[],uint256)'
        ],
        [
          [
            pairs,
            args.admitted,
            exclusions,
            BigInt(args.totalAdmittedWeight).toString()
          ]
        ]
      )
      .slice(2),
    'hex'
  );
  const packed = Buffer.concat([AGGREGATE_DST, electionId, encoded]);
  return Buffer.from(keccak256(packed).slice(2), 'hex');
}

/** One keyper's partial decryption of one candidate. */
export interface GegShareEntry {
  /** 96-byte compressed G2 point. */
  sigma: string;
  /** 64-byte DLEQ proof: `e ‖ z`, two 32-byte big-endian scalars. */
  proof: string;
}

/**
 * The digest a keyper signs over its decryption shares.
 *
 * **Two separate ABI encodes, concatenated** — the sigmas as `bytes[]`, then the
 * proofs as `(uint256,uint256)[]` — not one encode of a pair. Encoding them
 * together produces a different byte string (the outer tuple adds its own offset
 * header) and therefore a digest no keyper will ever match.
 *
 * The proof arrives as 64 bytes on the wire and is split here into the two
 * scalars the digest encodes, mirroring how the protocol unpacks it.
 */
export function decryptionShareDigest(args: {
  electionId: string;
  entries: GegShareEntry[];
}): Buffer {
  const electionId = decodeSized(args.electionId, 'electionId', 32);
  if (!Array.isArray(args.entries) || args.entries.length === 0) {
    throw new GegDigestError('entries: expected a non-empty array');
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
 * Binds every field of the artifact: the per-candidate totals, the keyper
 * indices credited with decrypting them, and the BSGS bound they were recovered
 * under. That is a deliberate change upstream — the earlier form signed only the
 * pair (operation, election), so a single captured signature authorised *any*
 * totals for that election. Anyone replaying it could have published a different
 * outcome for the same proposal.
 *
 * Totals go through `BigInt`: they are sums over weighted ballots and routinely
 * exceed what a JS number carries losslessly.
 */
export function resultDigest(args: {
  electionId: string;
  totals: Array<number | string | bigint>;
  keyperIndices: Array<number | string>;
  bsgsBound: number | string | bigint;
}): Buffer {
  const electionId = decodeSized(args.electionId, 'electionId', 32);
  if (!Array.isArray(args.totals) || args.totals.length === 0) {
    throw new GegDigestError('totals: expected a non-empty array');
  }
  if (!Array.isArray(args.keyperIndices) || args.keyperIndices.length === 0) {
    throw new GegDigestError('keyperIndices: expected a non-empty array');
  }

  const asUint = (value: unknown, label: string): string => {
    let n: bigint;
    try {
      n = BigInt(value as any);
    } catch {
      throw new GegDigestError(`${label}: expected an integer (got ${value})`);
    }
    if (n < 0n) throw new GegDigestError(`${label}: must not be negative`);
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
 * The digest an *operation* signature is taken over.
 *
 * Role-key writes — publishing a result, stalling a tally, resuming one — are
 * authorised as a named operation rather than as a bare artifact, and the
 * signature covers this wrapper, not the artifact digest directly. Getting that
 * wrong is silent: ECDSA recovery over the wrong message still yields a valid,
 * deterministic address, so it presents as "signed by a stranger" rather than
 * as an encoding fault.
 *
 * Every field is length-framed (`u32BE(len) ‖ bytes`) under its own tag. The
 * earlier form joined them with `|` and no framing, which made
 * `("a", "b", "c|d")` and `("a", "b|c", "d")` share a signature — unreachable
 * with fixed op names and 32-byte ids, but true by convention rather than by
 * construction.
 *
 * `payload` is empty for operations fully described by (op, election): the stall
 * and resume ops encode their direction in the op string itself. The result
 * carries `resultDigest(...)`, so one signature cannot be re-paired with
 * different totals.
 */

export function requestNoncePayload(issuedAt: number): Buffer {
  if (!Number.isInteger(issuedAt) || issuedAt < 0) {
    throw new GegDigestError(
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
 * Recover the EIP-191 signer of a digest, checksummed.
 *
 * Returns `null` rather than throwing on a malformed signature, so a caller can
 * treat an unrecoverable signature exactly like a wrong one and answer with a
 * single uniform status — a prober learns nothing about which it was.
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
