import { keccak256 } from 'viem';
import {
  BallotInputs,
  BallotValidityProof,
  BallotVerifyParams,
  G1Point,
  G2Point,
  canonicalBallotMessage,
  encodeBallotValidityProof,
  encodeSchnorr,
  encrypt,
  initCurves,
  proveBudgetAtMost,
  proveBudgetExact,
  proveOR,
  rangeCandidates,
  schnorrKeygen,
  schnorrSign,
  seedBallotTranscript,
  sumCts,
  verifyBallot,
} from '../src';
import { randomScalar } from '../src/crypto/field';

beforeAll(async () => {
  await initCurves();
});

function trustedSetup() {
  const msk = randomScalar();
  const mpk = G2Point.generator().mul(msk);
  return { msk, mpk };
}

/**
 * Frontend-side ballot assembly. Lives in tests, not in src, to honour
 * the "no ballot builder" decision — consumers wire these calls up
 * themselves using the primitives the SDK exposes.
 */
function buildBallot(args: {
  mpk: G2Point;
  electionId: Uint8Array;
  pseudonym: Uint8Array;
  votes: bigint[];
  params: BallotVerifyParams;
  wrAttestation?: Uint8Array;
}): { inputs: BallotInputs; sk: bigint } {
  const { mpk, electionId, pseudonym, votes, params } = args;
  if (votes.length !== params.numCandidates) {
    throw new Error('buildBallot: votes.length mismatch');
  }

  const { sk, vk } = schnorrKeygen();

  // Produce the ciphertext wire and the per-ciphertext randomness. For
  // Variant A this is one ct per candidate; for Variant B it's d cts per
  // candidate in row-major (candidate, bit) order.
  let cts: { c1: G2Point; c2: G2Point }[];
  let rs: bigint[];
  if (params.variant === 'A') {
    const perCand = votes.map((v) => encrypt(v, mpk));
    cts = perCand.map((p) => p.ct);
    rs = perCand.map((p) => p.r);
  } else {
    const d = params.d!;
    cts = [];
    rs = [];
    for (let j = 0; j < votes.length; j++) {
      const v = votes[j]!;
      if (v < 0n || v >= 1n << BigInt(d)) {
        throw new Error(`buildBallot: vote ${v} out of range for d=${d}`);
      }
      for (let k = 0; k < d; k++) {
        const bit = Number((v >> BigInt(k)) & 1n) as 0 | 1;
        const { ct, r } = encrypt(BigInt(bit), mpk);
        cts.push(ct);
        rs.push(r);
      }
    }
  }

  const t = seedBallotTranscript(electionId, mpk, vk, cts, params);

  let rangeOrBit;
  if (params.variant === 'A') {
    const candidates = rangeCandidates(params.budget);
    rangeOrBit = cts.map((ct, j) => {
      t.append('ballot:range', u16BE(j));
      return proveOR(
        { ct, mpk, candidates },
        { r: rs[j]!, trueIndex: Number(votes[j]!) },
        t,
      );
    });
  } else {
    const d = params.d!;
    rangeOrBit = [];
    for (let jk = 0; jk < cts.length; jk++) {
      const j = Math.floor(jk / d);
      const k = jk % d;
      const bit = Number((votes[j]! >> BigInt(k)) & 1n) as 0 | 1;
      t.append('ballot:bit', u16BE(jk));
      rangeOrBit.push(
        proveOR(
          { ct: cts[jk]!, mpk, candidates: [0n, 1n] },
          { r: rs[jk]!, trueIndex: bit },
          t,
        ),
      );
    }
  }

  // Build the aggregate ciphertext + aggregate randomness the budget proof
  // runs against. Variant A: ctSum = Σ ct_j, rSum = Σ r_j. Variant B:
  // ĉ = Σ_j Σ_k 2^k · ct_{j,k}, r̂ = Σ_j Σ_k 2^k · r_{j,k}.
  let ctSum: { c1: G2Point; c2: G2Point };
  let rSum: bigint;
  if (params.variant === 'A') {
    ctSum = sumCts(cts);
    rSum = rs.reduce((a, r) => a + r, 0n);
  } else {
    const d = params.d!;
    // weights per ciphertext index: 2^(jk mod d).
    const weighted = cts.map((ct, i) => {
      const k = i % d;
      return { ct, r: rs[i]!, w: 1n << BigInt(k) };
    });
    ctSum = weighted
      .map(({ ct, w }) => ({
        c1: ct.c1.mul(w),
        c2: ct.c2.mul(w),
      }))
      .reduce((acc, cur) => ({
        c1: acc.c1.add(cur.c1),
        c2: acc.c2.add(cur.c2),
      }));
    rSum = weighted.reduce((a, { r, w }) => a + r * w, 0n);
  }
  const V = votes.reduce((a, b) => a + b, 0n);
  t.append('ballot:budget', new Uint8Array([0]));
  const budget =
    params.mode === 'exact'
      ? proveBudgetExact({ ctSum, mpk, budget: BigInt(params.budget) }, { rSum }, t)
      : proveBudgetAtMost(
          { ctSum, mpk, budget: BigInt(params.budget) },
          { rSum, V },
          t,
        );

  const bvp: BallotValidityProof = {
    version: 0x01,
    variant: params.variant,
    rangeOrBit,
    budget,
  };
  const zkProof = encodeBallotValidityProof(bvp);

  const ciphertextBytes: [Uint8Array, Uint8Array][] = cts.map((ct) => [
    ct.c1.toBytes(),
    ct.c2.toBytes(),
  ]);

  const preimage = canonicalBallotMessage({
    electionId,
    pseudonym,
    ciphertexts: ciphertextBytes,
    zkProof,
  });
  const msg = keccak256(preimage, 'bytes');
  const sig = schnorrSign(sk, vk, msg);

  return {
    inputs: {
      electionId,
      pseudonym,
      vk: vk.toBytes(),
      ciphertexts: ciphertextBytes,
      zkProof,
      voterSignature: encodeSchnorr(sig),
      wrAttestation: args.wrAttestation ?? new Uint8Array([0x01]),
    },
    sk,
  };
}

function u16BE(n: number): Uint8Array {
  const o = new Uint8Array(2);
  o[0] = (n >>> 8) & 0xff;
  o[1] = n & 0xff;
  return o;
}

const accept = () => true;
const reject = () => false;

describe('canonicalBallotMessage', () => {
  it('is deterministic for identical inputs', () => {
    const args = {
      electionId: new Uint8Array(32).fill(0x11),
      pseudonym: new Uint8Array(32).fill(0x22),
      ciphertexts: [
        [new Uint8Array(96).fill(0xaa), new Uint8Array(96).fill(0xbb)] as [
          Uint8Array,
          Uint8Array,
        ],
      ],
      zkProof: new Uint8Array([1, 2, 3]),
    };
    const a = canonicalBallotMessage(args);
    const b = canonicalBallotMessage(args);
    expect(a).toEqual(b);
  });

  it('flipping any field changes the preimage', () => {
    const base = {
      electionId: new Uint8Array(32).fill(0x11),
      pseudonym: new Uint8Array(32).fill(0x22),
      ciphertexts: [
        [new Uint8Array(96).fill(0xaa), new Uint8Array(96).fill(0xbb)] as [
          Uint8Array,
          Uint8Array,
        ],
      ],
      zkProof: new Uint8Array([1, 2, 3]),
    };
    const variants = [
      { ...base, electionId: new Uint8Array(32).fill(0x12) },
      { ...base, pseudonym: new Uint8Array(32).fill(0x23) },
      { ...base, zkProof: new Uint8Array([1, 2, 4]) },
      {
        ...base,
        ciphertexts: [
          [new Uint8Array(96).fill(0xac), new Uint8Array(96).fill(0xbb)] as [
            Uint8Array,
            Uint8Array,
          ],
        ],
      },
    ];
    const baseBytes = canonicalBallotMessage(base);
    for (const v of variants) {
      expect(canonicalBallotMessage(v)).not.toEqual(baseBytes);
    }
  });

  it('rejects ciphertext components of the wrong length', () => {
    expect(() =>
      canonicalBallotMessage({
        electionId: new Uint8Array(32),
        pseudonym: new Uint8Array(32),
        ciphertexts: [[new Uint8Array(95), new Uint8Array(96)]],
        zkProof: new Uint8Array(0),
      }),
    ).toThrow(/96 bytes/);
  });

  it('rejects electionId of the wrong length', () => {
    for (const len of [0, 16, 31, 33, 64]) {
      expect(() =>
        canonicalBallotMessage({
          electionId: new Uint8Array(len),
          pseudonym: new Uint8Array(32),
          ciphertexts: [],
          zkProof: new Uint8Array(0),
        }),
      ).toThrow(/electionId.*32 bytes/);
    }
  });

  it('rejects pseudonym of the wrong length', () => {
    for (const len of [0, 16, 31, 33, 64]) {
      expect(() =>
        canonicalBallotMessage({
          electionId: new Uint8Array(32),
          pseudonym: new Uint8Array(len),
          ciphertexts: [],
          zkProof: new Uint8Array(0),
        }),
      ).toThrow(/pseudonym.*32 bytes/);
    }
  });
});

describe('verifyBallot — parameter validation (fail-closed on junk inputs)', () => {
  const validParams: BallotVerifyParams = {
    numCandidates: 3,
    budget: 2,
    mode: 'exact',
    variant: 'A',
  };
  // Minimal inputs — sufficient to reach the parameter prologue. These tests
  // only exercise the pre-decode rejections, so ballot-level soundness does
  // not need to hold.
  const minimalInputs = (): BallotInputs => ({
    electionId: new Uint8Array(32),
    pseudonym: new Uint8Array(32),
    vk: G1Point.generator().toBytes(),
    ciphertexts: [],
    zkProof: new Uint8Array(0),
    voterSignature: new Uint8Array(80),
    wrAttestation: new Uint8Array(0),
  });

  it('rejects non-integer numCandidates', () => {
    const { mpk } = trustedSetup();
    const r = verifyBallot(
      minimalInputs(),
      { ...validParams, numCandidates: 1.5 },
      mpk,
      accept,
    );
    expect(r).toEqual({ ok: false, reason: 'numCandidates must be an integer' });
  });

  it('rejects numCandidates below 1', () => {
    const { mpk } = trustedSetup();
    for (const n of [0, -1, -0x10000]) {
      const r = verifyBallot(minimalInputs(), { ...validParams, numCandidates: n }, mpk, accept);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toMatch(/numCandidates.*out of range/);
    }
  });

  it('rejects numCandidates above 0xFFFF (codec u16 ceiling)', () => {
    const { mpk } = trustedSetup();
    const r = verifyBallot(
      minimalInputs(),
      { ...validParams, numCandidates: 0x10000 },
      mpk,
      accept,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/numCandidates.*out of range/);
  });

  it('rejects non-integer budget', () => {
    const { mpk } = trustedSetup();
    const r = verifyBallot(minimalInputs(), { ...validParams, budget: 1.5 }, mpk, accept);
    expect(r).toEqual({ ok: false, reason: 'budget must be an integer' });
  });

  it('rejects budget = 0 (Munich spec requires B ≥ 1)', () => {
    const { mpk } = trustedSetup();
    const r = verifyBallot(minimalInputs(), { ...validParams, budget: 0 }, mpk, accept);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/budget.*out of range/);
  });

  it('rejects negative budget', () => {
    const { mpk } = trustedSetup();
    const r = verifyBallot(minimalInputs(), { ...validParams, budget: -1 }, mpk, accept);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/budget.*out of range/);
  });

  it('rejects budget above 0xFFFF', () => {
    const { mpk } = trustedSetup();
    const r = verifyBallot(minimalInputs(), { ...validParams, budget: 0x10000 }, mpk, accept);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/budget.*out of range/);
  });

  it('rejects unknown mode', () => {
    const { mpk } = trustedSetup();
    const r = verifyBallot(
      minimalInputs(),
      { ...validParams, mode: 'bogus' as unknown as 'exact' },
      mpk,
      accept,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/unknown mode/);
  });

  it('rejects unknown variant', () => {
    const { mpk } = trustedSetup();
    const r = verifyBallot(
      minimalInputs(),
      { ...validParams, variant: 'C' as unknown as 'A' },
      mpk,
      accept,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/unknown variant/);
  });

  it('rejects Variant B with non-integer d', () => {
    const { mpk } = trustedSetup();
    const r = verifyBallot(
      minimalInputs(),
      { numCandidates: 3, budget: 3, mode: 'exact', variant: 'B', d: 1.5 },
      mpk,
      accept,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/Variant B requires a positive integer d/);
  });

  it('rejects Variant B with d ≤ 0', () => {
    const { mpk } = trustedSetup();
    for (const d of [0, -1]) {
      const r = verifyBallot(
        minimalInputs(),
        { numCandidates: 3, budget: 3, mode: 'exact', variant: 'B', d },
        mpk,
        accept,
      );
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toMatch(/Variant B requires a positive integer d/);
    }
  });

  it('rejects electionId whose byte length is not 32', () => {
    const { mpk } = trustedSetup();
    for (const len of [0, 16, 31, 33, 64]) {
      const r = verifyBallot(
        { ...minimalInputs(), electionId: new Uint8Array(len) },
        validParams,
        mpk,
        accept,
      );
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toMatch(/electionId must be 32 bytes/);
    }
  });

  it('rejects pseudonym whose byte length is not 32', () => {
    const { mpk } = trustedSetup();
    for (const len of [0, 16, 31, 33, 64]) {
      const r = verifyBallot(
        { ...minimalInputs(), pseudonym: new Uint8Array(len) },
        validParams,
        mpk,
        accept,
      );
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toMatch(/pseudonym must be 32 bytes/);
    }
  });

  it('rejects identity mpk (collapses ciphertext privacy)', () => {
    const mpk = G2Point.identity();
    const r = verifyBallot(minimalInputs(), validParams, mpk, accept);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/mpk is the identity/);
  });

  it('rejects identity vk (sk=0 trivially verifies every signature)', () => {
    const { mpk } = trustedSetup();
    // ciphertexts still empty — but the identity-vk check fires *after*
    // ciphertexts.length, so we need to pass a params/inputs pair where
    // expectedCts = 0. Variant A with numCandidates matching length = 0
    // would violate numCandidates ≥ 1, so instead give Variant A inputs
    // with numCandidates=1 and a single 96-byte placeholder ct — its G2
    // decode happens later, after the vk identity guard fires.
    const inputs: BallotInputs = {
      ...minimalInputs(),
      vk: G1Point.identity().toBytes(),
      ciphertexts: [[G2Point.generator().toBytes(), G2Point.generator().toBytes()]],
    };
    const r = verifyBallot(
      inputs,
      { numCandidates: 1, budget: 1, mode: 'exact', variant: 'A' },
      mpk,
      accept,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/vk is the identity/);
  });
});

describe('verifyBallot — Variant A, exact budget', () => {
  const params: BallotVerifyParams = {
    numCandidates: 3,
    budget: 2,
    mode: 'exact',
    variant: 'A',
  };

  it('honest ballot verifies', () => {
    const { mpk } = trustedSetup();
    const { inputs } = buildBallot({
      mpk,
      electionId: new Uint8Array(32).fill(0xde),
      pseudonym: new Uint8Array(32).fill(0xad),
      votes: [1n, 1n, 0n], // V = 2 = B
      params,
    });
    expect(verifyBallot(inputs, params, mpk, accept)).toEqual({ ok: true });
  });

  it('rejects when wrAttestation verifier rejects', () => {
    const { mpk } = trustedSetup();
    const { inputs } = buildBallot({
      mpk,
      electionId: new Uint8Array(32),
      pseudonym: new Uint8Array(32),
      votes: [1n, 1n, 0n],
      params,
    });
    const r = verifyBallot(inputs, params, mpk, reject);
    expect(r).toEqual({ ok: false, reason: 'wrAttestation verification failed' });
  });

  it('rejects a flipped byte in a ciphertext', () => {
    const { mpk } = trustedSetup();
    const { inputs } = buildBallot({
      mpk,
      electionId: new Uint8Array(32),
      pseudonym: new Uint8Array(32),
      votes: [2n, 0n, 0n],
      params,
    });
    // Corrupt the first ciphertext's C1 point bytes.
    const tampered = inputs.ciphertexts.map(([c1, c2], i) => {
      if (i !== 0) return [c1, c2] as [Uint8Array, Uint8Array];
      const bad = new Uint8Array(c1);
      bad[50] ^= 0x01;
      return [bad, c2] as [Uint8Array, Uint8Array];
    });
    const r = verifyBallot(
      { ...inputs, ciphertexts: tampered },
      params,
      mpk,
      accept,
    );
    expect(r.ok).toBe(false);
  });

  it('rejects ballot copied under a different vk (voter impersonation)', () => {
    const { mpk } = trustedSetup();
    const { inputs } = buildBallot({
      mpk,
      electionId: new Uint8Array(32),
      pseudonym: new Uint8Array(32),
      votes: [1n, 1n, 0n],
      params,
    });
    const { vk: vk2 } = schnorrKeygen();
    const r = verifyBallot({ ...inputs, vk: vk2.toBytes() }, params, mpk, accept);
    expect(r.ok).toBe(false);
  });

  it('rejects a wrong electionId (cross-election replay)', () => {
    const { mpk } = trustedSetup();
    const { inputs } = buildBallot({
      mpk,
      electionId: new Uint8Array(32).fill(0x01),
      pseudonym: new Uint8Array(32),
      votes: [1n, 1n, 0n],
      params,
    });
    const r = verifyBallot(
      { ...inputs, electionId: new Uint8Array(32).fill(0x02) },
      params,
      mpk,
      accept,
    );
    expect(r.ok).toBe(false);
  });

  it('rejects when declared budget differs from signed budget', () => {
    const { mpk } = trustedSetup();
    const { inputs } = buildBallot({
      mpk,
      electionId: new Uint8Array(32),
      pseudonym: new Uint8Array(32),
      votes: [1n, 1n, 0n], // V = 2 = B
      params,
    });
    // Verifier is told B = 3 — decoder size mismatch.
    const r = verifyBallot(
      inputs,
      { ...params, budget: 3 },
      mpk,
      accept,
    );
    expect(r.ok).toBe(false);
  });

  it('rejects ciphertexts.length not matching numCandidates', () => {
    const { mpk } = trustedSetup();
    const { inputs } = buildBallot({
      mpk,
      electionId: new Uint8Array(32),
      pseudonym: new Uint8Array(32),
      votes: [1n, 1n, 0n],
      params,
    });
    const r = verifyBallot(
      inputs,
      { ...params, numCandidates: 4 },
      mpk,
      accept,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/ciphertexts.length/);
  });
});

describe('verifyBallot — Variant A, at-most budget', () => {
  const params: BallotVerifyParams = {
    numCandidates: 3,
    budget: 3,
    mode: 'atMost',
    variant: 'A',
  };

  it('honest ballot verifies across V ∈ {0..B}', () => {
    const { mpk } = trustedSetup();
    const scenarios: bigint[][] = [
      [0n, 0n, 0n], // V = 0
      [1n, 0n, 0n],
      [1n, 1n, 0n],
      [2n, 1n, 0n], // V = B
    ];
    for (const votes of scenarios) {
      const { inputs } = buildBallot({
        mpk,
        electionId: new Uint8Array(32),
        pseudonym: new Uint8Array(32),
        votes,
        params,
      });
      expect(verifyBallot(inputs, params, mpk, accept)).toEqual({ ok: true });
    }
  });

  it('rejects a wire with mode=exact against params.mode=atMost', () => {
    const { mpk } = trustedSetup();
    const { inputs } = buildBallot({
      mpk,
      electionId: new Uint8Array(32),
      pseudonym: new Uint8Array(32),
      votes: [1n, 1n, 1n], // V = B
      params: { ...params, mode: 'exact' },
    });
    const r = verifyBallot(inputs, params, mpk, accept); // ask for atMost
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/budget mode/);
  });
});

describe('verifyBallot — structural rejections', () => {
  it('rejects an invalid vk encoding', () => {
    const { mpk } = trustedSetup();
    const { inputs } = buildBallot({
      mpk,
      electionId: new Uint8Array(32),
      pseudonym: new Uint8Array(32),
      votes: [0n, 0n, 0n],
      params: { numCandidates: 3, budget: 1, mode: 'atMost', variant: 'A' },
    });
    const r = verifyBallot(
      { ...inputs, vk: new Uint8Array(48) }, // all-zero is not a valid compressed G1 point
      { numCandidates: 3, budget: 1, mode: 'atMost', variant: 'A' },
      mpk,
      accept,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/vk decode/);
  });

  it('rejects Variant B without d', () => {
    const { mpk } = trustedSetup();
    const { inputs } = buildBallot({
      mpk,
      electionId: new Uint8Array(32),
      pseudonym: new Uint8Array(32),
      votes: [0n, 0n, 0n],
      params: { numCandidates: 3, budget: 1, mode: 'atMost', variant: 'A' },
    });
    const r = verifyBallot(
      inputs,
      { numCandidates: 3, budget: 1, mode: 'atMost', variant: 'B' },
      mpk,
      accept,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/Variant B requires/);
  });

  it('rejects signature forged by a different sk', () => {
    const { mpk } = trustedSetup();
    const { inputs } = buildBallot({
      mpk,
      electionId: new Uint8Array(32),
      pseudonym: new Uint8Array(32),
      votes: [0n, 0n, 0n],
      params: { numCandidates: 3, budget: 1, mode: 'atMost', variant: 'A' },
    });
    // Resign with an unrelated key — vk in inputs stays the same, so Schnorr fails.
    const other = schnorrKeygen();
    const preimage = canonicalBallotMessage({
      electionId: inputs.electionId,
      pseudonym: inputs.pseudonym,
      ciphertexts: inputs.ciphertexts,
      zkProof: inputs.zkProof,
    });
    const forged = schnorrSign(other.sk, other.vk, keccak256(preimage, 'bytes'));
    const r = verifyBallot(
      { ...inputs, voterSignature: encodeSchnorr(forged) },
      { numCandidates: 3, budget: 1, mode: 'atMost', variant: 'A' },
      mpk,
      accept,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/signature/);
  });
});

describe('verifyBallot — Variant B (binary decomposition)', () => {
  const B = 3;
  const d = 2; // 2^2 - 1 = 3 = B
  const baseParams: BallotVerifyParams = {
    numCandidates: 3,
    budget: B,
    mode: 'exact',
    variant: 'B',
    d,
  };

  it('honest ballot verifies (exact budget)', () => {
    const { mpk } = trustedSetup();
    const { inputs } = buildBallot({
      mpk,
      electionId: new Uint8Array(32).fill(0xa1),
      pseudonym: new Uint8Array(32).fill(0xa2),
      votes: [2n, 1n, 0n], // sum = 3 = B
      params: baseParams,
    });
    expect(verifyBallot(inputs, baseParams, mpk, accept).ok).toBe(true);
  });

  it('honest ballot verifies (atMost budget)', () => {
    const { mpk } = trustedSetup();
    const params: BallotVerifyParams = { ...baseParams, mode: 'atMost' };
    const { inputs } = buildBallot({
      mpk,
      electionId: new Uint8Array(32),
      pseudonym: new Uint8Array(32),
      votes: [1n, 1n, 0n], // sum = 2 < B
      params,
    });
    expect(verifyBallot(inputs, params, mpk, accept).ok).toBe(true);
  });

  it('mismatched d is rejected (exact ⌈log₂(B+1)⌉ required)', () => {
    const { mpk } = trustedSetup();
    const { inputs } = buildBallot({
      mpk,
      electionId: new Uint8Array(32),
      pseudonym: new Uint8Array(32),
      votes: [2n, 1n, 0n],
      params: baseParams,
    });
    // ciphertexts has ℓ·d = 6; the verifier is asked to expect d=3 but
    // spec d = ⌈log₂(B+1)⌉ = 2 for B=3, so verification rejects on d
    // mismatch before ever reaching the ciphertext-count check.
    const r = verifyBallot(
      inputs,
      { ...baseParams, d: 3 },
      mpk,
      accept,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/d \(3\) must equal/);
  });

  it('rejects a ballot with a tampered bit ciphertext', () => {
    const { mpk } = trustedSetup();
    const { inputs } = buildBallot({
      mpk,
      electionId: new Uint8Array(32),
      pseudonym: new Uint8Array(32),
      votes: [2n, 0n, 0n],
      params: baseParams,
    });
    // Replace one bit ciphertext's C2 with an unrelated point.
    const tamperedCts = inputs.ciphertexts.map(([c1, c2], i) =>
      i === 0 ? ([c1, G2Point.generator().toBytes()] as [Uint8Array, Uint8Array]) : [c1, c2] as [Uint8Array, Uint8Array],
    );
    const r = verifyBallot(
      { ...inputs, ciphertexts: tamperedCts },
      baseParams,
      mpk,
      accept,
    );
    expect(r.ok).toBe(false);
  });

  it('rejects when d disagrees with the declared budget', () => {
    const { mpk } = trustedSetup();
    const { inputs } = buildBallot({
      mpk,
      electionId: new Uint8Array(32),
      pseudonym: new Uint8Array(32),
      votes: [0n, 0n, 0n],
      params: baseParams,
    });
    const r = verifyBallot(
      inputs,
      { ...baseParams, budget: 7, d: 2 }, // spec requires d = 3 for B=7
      mpk,
      accept,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/must equal ⌈log₂/);
  });

  it('rejects a ballot when budget mode differs from the on-wire tag', () => {
    const { mpk } = trustedSetup();
    const { inputs } = buildBallot({
      mpk,
      electionId: new Uint8Array(32),
      pseudonym: new Uint8Array(32),
      votes: [2n, 1n, 0n],
      params: baseParams, // exact
    });
    const r = verifyBallot(
      inputs,
      { ...baseParams, mode: 'atMost' },
      mpk,
      accept,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/budget mode/);
  });
});
