/**
 * Unit tests for the DLEQ decryption-share verification added to
 * POST /proposal/:id/te_decryption_share.
 *
 * Tests the exact transcript seeding and verification path used in the
 * endpoint without touching the DB or HTTP layer. The test generates real
 * DLEQ proofs via the SDK (same library the endpoint calls) so a
 * transcript mismatch between prover and verifier sides surfaces here.
 */
import {
  G2Point,
  initCurves,
  partialDecrypt,
  Transcript,
  verifyDecryptionShare
} from '@snapshot-labs/private-vote-sdk';

// Fixed scalar — small enough to be readable, non-zero.
const MSK_K = 0xdeadbeefcafebaben;
const KEYPER_INDEX = 1;
const PROPOSAL_ID = `0x${'ab'.repeat(32)}`; // 32-byte hex, as Snapshot proposal ids are
const CANDIDATE = 0;

let mpkK: G2Point;
let C1: G2Point;
let C2: G2Point;

beforeAll(async () => {
  await initCurves();
  // mpk_k = msk_k * G2
  const P2 = G2Point.generator();
  mpkK = P2.mul(MSK_K);
  P2.destroyWasm();
  // Fake aggregate ciphertext — any valid on-curve G2 points work; DLEQ
  // verification is purely algebraic and doesn't require the ciphertext to
  // decrypt to anything meaningful.
  C1 = G2Point.generator();
  C2 = G2Point.generator();
});

afterAll(() => {
  mpkK?.destroyWasm();
  C1?.destroyWasm();
  C2?.destroyWasm();
});

/**
 * Mirrors the transcript seeding in the hub endpoint and in
 * sdk_compat.make_onchain_decrypt_transcript (Python keyper side).
 * Label → electionId (32 raw bytes from 0x-hex proposalId) → candidate (u16BE).
 */
function makeTranscript(proposalId: string, candidate: number): Transcript {
  const t = new Transcript('SHUTTER-VOTE-DECRYPT-v1');
  t.append('electionId', Buffer.from(proposalId.replace(/^0x/, ''), 'hex'));
  const candidateBuf = Buffer.alloc(2);
  candidateBuf.writeUInt16BE(candidate, 0);
  t.append('candidate', candidateBuf);
  return t;
}

describe('DLEQ decryption share verification', () => {
  test('valid proof is accepted', () => {
    const share = partialDecrypt(
      { c1: C1, c2: C2 },
      MSK_K,
      mpkK,
      KEYPER_INDEX,
      makeTranscript(PROPOSAL_ID, CANDIDATE)
    );

    const ok = verifyDecryptionShare(
      { c1: C1, c2: C2 },
      { keyperIndex: KEYPER_INDEX, sigma: share.sigma, proof: share.proof },
      mpkK,
      makeTranscript(PROPOSAL_ID, CANDIDATE)
    );

    share.sigma.destroyWasm();
    expect(ok).toBe(true);
  });

  test('corrupted proof.e is rejected', () => {
    const share = partialDecrypt(
      { c1: C1, c2: C2 },
      MSK_K,
      mpkK,
      KEYPER_INDEX,
      makeTranscript(PROPOSAL_ID, CANDIDATE)
    );

    const ok = verifyDecryptionShare(
      { c1: C1, c2: C2 },
      {
        keyperIndex: KEYPER_INDEX,
        sigma: share.sigma,
        proof: { e: share.proof.e + 1n, z: share.proof.z }
      },
      mpkK,
      makeTranscript(PROPOSAL_ID, CANDIDATE)
    );

    share.sigma.destroyWasm();
    expect(ok).toBe(false);
  });

  test('corrupted proof.z is rejected', () => {
    const share = partialDecrypt(
      { c1: C1, c2: C2 },
      MSK_K,
      mpkK,
      KEYPER_INDEX,
      makeTranscript(PROPOSAL_ID, CANDIDATE)
    );

    const ok = verifyDecryptionShare(
      { c1: C1, c2: C2 },
      {
        keyperIndex: KEYPER_INDEX,
        sigma: share.sigma,
        proof: { e: share.proof.e, z: share.proof.z + 1n }
      },
      mpkK,
      makeTranscript(PROPOSAL_ID, CANDIDATE)
    );

    share.sigma.destroyWasm();
    expect(ok).toBe(false);
  });

  test('wrong committee public key is rejected', () => {
    const share = partialDecrypt(
      { c1: C1, c2: C2 },
      MSK_K,
      mpkK,
      KEYPER_INDEX,
      makeTranscript(PROPOSAL_ID, CANDIDATE)
    );

    const P2 = G2Point.generator();
    const wrongPK = P2.mul(MSK_K + 1n);
    P2.destroyWasm();

    const ok = verifyDecryptionShare(
      { c1: C1, c2: C2 },
      { keyperIndex: KEYPER_INDEX, sigma: share.sigma, proof: share.proof },
      wrongPK,
      makeTranscript(PROPOSAL_ID, CANDIDATE)
    );

    share.sigma.destroyWasm();
    wrongPK.destroyWasm();
    expect(ok).toBe(false);
  });

  test('wrong sigma is rejected', () => {
    const share = partialDecrypt(
      { c1: C1, c2: C2 },
      MSK_K,
      mpkK,
      KEYPER_INDEX,
      makeTranscript(PROPOSAL_ID, CANDIDATE)
    );

    const wrongSigma = G2Point.generator();

    const ok = verifyDecryptionShare(
      { c1: C1, c2: C2 },
      { keyperIndex: KEYPER_INDEX, sigma: wrongSigma, proof: share.proof },
      mpkK,
      makeTranscript(PROPOSAL_ID, CANDIDATE)
    );

    share.sigma.destroyWasm();
    wrongSigma.destroyWasm();
    expect(ok).toBe(false);
  });

  test('different candidate index in transcript is rejected', () => {
    // Proof generated for candidate 0 must not verify under candidate 1 transcript.
    const share = partialDecrypt(
      { c1: C1, c2: C2 },
      MSK_K,
      mpkK,
      KEYPER_INDEX,
      makeTranscript(PROPOSAL_ID, CANDIDATE)
    );

    const ok = verifyDecryptionShare(
      { c1: C1, c2: C2 },
      { keyperIndex: KEYPER_INDEX, sigma: share.sigma, proof: share.proof },
      mpkK,
      makeTranscript(PROPOSAL_ID, CANDIDATE + 1)
    );

    share.sigma.destroyWasm();
    expect(ok).toBe(false);
  });

  test('different proposalId in transcript is rejected', () => {
    // Proof bound to one election must not verify under a different election id.
    const share = partialDecrypt(
      { c1: C1, c2: C2 },
      MSK_K,
      mpkK,
      KEYPER_INDEX,
      makeTranscript(PROPOSAL_ID, CANDIDATE)
    );

    const ok = verifyDecryptionShare(
      { c1: C1, c2: C2 },
      { keyperIndex: KEYPER_INDEX, sigma: share.sigma, proof: share.proof },
      mpkK,
      makeTranscript(`0x${'cd'.repeat(32)}`, CANDIDATE)
    );

    share.sigma.destroyWasm();
    expect(ok).toBe(false);
  });

  test('proof.e and proof.z round-trip through decimal string (wire format)', () => {
    // The keyper sends proof_e/proof_z as decimal strings; the endpoint does
    // BigInt(proofE) / BigInt(proofZ). Verify the round-trip is lossless.
    const share = partialDecrypt(
      { c1: C1, c2: C2 },
      MSK_K,
      mpkK,
      KEYPER_INDEX,
      makeTranscript(PROPOSAL_ID, CANDIDATE)
    );

    const proofEStr = share.proof.e.toString();
    const proofZStr = share.proof.z.toString();

    const ok = verifyDecryptionShare(
      { c1: C1, c2: C2 },
      {
        keyperIndex: KEYPER_INDEX,
        sigma: share.sigma,
        proof: { e: BigInt(proofEStr), z: BigInt(proofZStr) }
      },
      mpkK,
      makeTranscript(PROPOSAL_ID, CANDIDATE)
    );

    share.sigma.destroyWasm();
    expect(ok).toBe(true);
  });
});
