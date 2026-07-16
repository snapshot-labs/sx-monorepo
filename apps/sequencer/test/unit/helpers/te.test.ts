import { G2Point, initCurves } from '@snapshot-labs/private-vote-sdk';
import {
  aggregateBallots,
  expectedPseudonym,
  verifyTeBallot
} from '../../../src/helpers/te';

// ---------------------------------------------------------------------------
// Shared fixture: compressed G2 generator point bytes, usable as a stand-in
// ciphertext. aggregateBallots does point arithmetic only — no ZK re-verify —
// so any valid on-curve point works for heap stress testing.
// ---------------------------------------------------------------------------
let G2_GENERATOR_HEX: string;

beforeAll(async () => {
  await initCurves();
  const genBytes = G2Point.generator().toBytes();
  G2_GENERATOR_HEX = `0x${Buffer.from(genBytes).toString('hex')}`;
});

// ---------------------------------------------------------------------------
// WASM heap stress tests
//
// Without destroyWasm() on G2Point, allocating N voters' worth of ciphertexts
// in a tight loop exhausts the fixed 16 MB WASM heap before the loop ends.
// The symptom is an Emscripten abort: "Cannot enlarge memory arrays to size …"
//
// With the fix, peak WASM usage stays at O(numCandidates) regardless of N
// because intermediate points are freed immediately after each voter.
// ---------------------------------------------------------------------------
describe('WASM heap management', () => {
  const NUM_CANDIDATES = 3;

  function makeFakeVote(vp = 1): { vp: number; choice: string } {
    return {
      vp,
      choice: JSON.stringify({
        electionId: `0x${'00'.repeat(32)}`,
        pseudonym: `0x${'00'.repeat(32)}`,
        vk: `0x${'00'.repeat(48)}`,
        ciphertexts: Array.from({ length: NUM_CANDIDATES }, () => ({
          c1: G2_GENERATOR_HEX,
          c2: G2_GENERATOR_HEX
        })),
        zkProof: '0x01',
        voterSignature: `0x${'00'.repeat(80)}`,
        wrAttestation: '0x'
      })
    };
  }

  test('aggregateBallots completes for 30,000 voters without exhausting the 16 MB WASM heap', async () => {
    // 30,000 voters × 3 candidates × 2 G2 points × ~288 bytes ≈ 51 MB — 3× the
    // heap limit. Without destroyWasm() this aborts with "Cannot enlarge memory
    // arrays" around voter ~9,200. With the fix, peak WASM usage is O(numCandidates)
    // = 6 points × 288 bytes ≈ 1.7 KB regardless of voter count.
    const votes = Array.from({ length: 30_000 }, () => makeFakeVote());
    const result = aggregateBallots(NUM_CANDIDATES, votes);
    expect(result).toHaveLength(NUM_CANDIDATES);
  }, 900_000); // 15 min ceiling — BLS12-381 G2 ops are expensive; expect ~10 min locally

  test('aggregateBallots handles weighted votes (vp > 1) at scale without heap exhaustion', async () => {
    // Weighted path allocates an extra scalarMulCt point per voter per candidate.
    // Verifies that branch also cleans up correctly.
    const votes = Array.from({ length: 5_000 }, (_, i) =>
      makeFakeVote((i % 10) + 1)
    );
    const result = aggregateBallots(NUM_CANDIDATES, votes);
    expect(result).toHaveLength(NUM_CANDIDATES);
  }, 30_000);

  test('aggregateBallots skips zero-weight votes and frees their ciphertexts', async () => {
    // Every other vote has vp=0 — these are skipped but must still free the
    // G2 points allocated by envelopeCiphertexts before the continue.
    const votes = Array.from({ length: 5_000 }, (_, i) =>
      makeFakeVote(i % 2 === 0 ? 1 : 0)
    );
    const result = aggregateBallots(NUM_CANDIDATES, votes);
    expect(result).toHaveLength(NUM_CANDIDATES);
  }, 30_000);
});

describe('helpers/te', () => {
  describe('expectedPseudonym', () => {
    test('is deterministic for fixed inputs', () => {
      const a = expectedPseudonym(
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222222222222222222222222222'
      );
      const b = expectedPseudonym(
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222222222222222222222222222'
      );
      expect(a).toBe(b);
      expect(a).toMatch(/^0x[0-9a-f]{64}$/);
    });

    test('changes with the proposal id', () => {
      const a = expectedPseudonym(
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222222222222222222222222222'
      );
      const b = expectedPseudonym(
        '0x1111111111111111111111111111111111111111',
        '0x3333333333333333333333333333333333333333333333333333333333333333'
      );
      expect(a).not.toBe(b);
    });
  });

  describe('verifyTeBallot — structural rejections', () => {
    const proposal = {
      id: '0x2222222222222222222222222222222222222222222222222222222222222222',
      te_config: {
        numCandidates: 2,
        budget: 1,
        mode: 'exact' as const,
        variant: 'A' as const
      },
      te_mpk: `0x${'ab'.repeat(96)}`
    };

    test('rejects when te_config missing', async () => {
      const r = await verifyTeBallot(
        { ...proposal, te_config: null },
        '0x1111111111111111111111111111111111111111',
        '{}'
      );
      expect(r).toEqual({ ok: false, reason: 'proposal_missing_te_config' });
    });

    test('rejects when DKG not finalised', async () => {
      const r = await verifyTeBallot(
        { ...proposal, te_mpk: null },
        '0x1111111111111111111111111111111111111111',
        '{}'
      );
      expect(r).toEqual({ ok: false, reason: 'proposal_dkg_not_finalized' });
    });

    test('rejects malformed JSON envelope', async () => {
      const r = await verifyTeBallot(
        proposal,
        '0x1111111111111111111111111111111111111111',
        'not json'
      );
      expect(r).toEqual({ ok: false, reason: 'choice_not_json_envelope' });
    });

    test('rejects pseudonym mismatch', async () => {
      const envelope = {
        electionId: `0x${'11'.repeat(32)}`,
        // Wrong pseudonym — does not equal keccak256(voter || proposalId).
        pseudonym: `0x${'00'.repeat(32)}`,
        vk: `0x${'00'.repeat(48)}`,
        ciphertexts: [],
        zkProof: '0x',
        voterSignature: `0x${'00'.repeat(80)}`,
        wrAttestation: '0x'
      };
      const r = await verifyTeBallot(
        proposal,
        '0x1111111111111111111111111111111111111111',
        JSON.stringify(envelope)
      );
      expect(r).toEqual({ ok: false, reason: 'pseudonym_mismatch' });
    });
  });
});
