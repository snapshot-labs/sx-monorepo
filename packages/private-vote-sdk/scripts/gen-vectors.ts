/**
 * One-shot generator for the cross-implementation test vectors under
 * `tests/vectors/`. Every randomness source (r, k, w, simulated e/z)
 * is derived from a counter-seeded SHA-256, so each run produces the
 * same bytes — regenerating is safe.
 *
 * Exception: `partialDecrypt` internally calls `proveDLEQ` with a fresh
 * `randomScalar()` that we can't inject without restructuring the
 * decrypt API. Its DLEQ proof therefore varies between runs. We work
 * around this by generating the share once and committing the JSON —
 * the re-verifier only needs verify-determinism, not prove-determinism.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { keccak256 } from 'viem';
import {
  BallotInputs,
  BallotValidityProof,
  BallotVerifyParams,
  Ciphertext,
  G1Point,
  G2Point,
  ORProof,
  Transcript,
  addCt,
  canonicalBallotMessage,
  combineShares,
  encodeBallotValidityProof,
  encodeDLEQ,
  encodeSchnorr,
  encrypt,
  initCurves,
  partialDecrypt,
  proveBudgetAtMost,
  proveBudgetExact,
  proveOR,
  rangeCandidates,
  schnorrKeygen,
  schnorrSign,
  seedBallotTranscript,
  sumCts,
  verifyBallot,
  verifyDecryptionShare,
} from '../src';
import { modQ } from '../src/crypto/field';
import {
  proveDLEQ,
  verifyBudget,
  verifyDLEQ,
  verifyOR,
} from '../src/voting/proofs';
import {
  BallotVector,
  BudgetVector,
  DecryptShareVector,
  DLEQVector,
  EncryptVector,
  ORVector,
  SchnorrVector,
  TallyVector,
  VECTOR_VERSION,
  bytesToHex,
  encodeORProof,
  g1ToHex,
  g2ToHex,
  scalarToDec,
} from '../tests/vectors/_schema';

// ---------- Deterministic RNG ----------

let rngCounter = 0;
function detScalar(tag: string): bigint {
  rngCounter += 1;
  const h = createHash('sha256');
  h.update(`shutter-vectors:${tag}:${rngCounter}`);
  return modQ(BigInt('0x' + h.digest('hex')));
}

function resetRng(tag: string): void {
  const h = createHash('sha256');
  h.update(`shutter-vectors:reset:${tag}`);
  rngCounter = Number(BigInt('0x' + h.digest('hex').slice(0, 8)));
}

// ---------- Output helpers ----------

const OUT_DIR = join(__dirname, '..', 'tests', 'vectors');

function writeVector(category: string, name: string, vec: unknown): void {
  const dir = join(OUT_DIR, category);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${name}.json`);
  writeFileSync(path, JSON.stringify(vec, null, 2) + '\n');
  // eslint-disable-next-line no-console
  console.log(`  wrote ${category}/${name}.json`);
}

function u16BE(n: number): Uint8Array {
  const o = new Uint8Array(2);
  o[0] = (n >>> 8) & 0xff;
  o[1] = n & 0xff;
  return o;
}

// ---------- Simulated DKG (test-only) ----------

function simulateDKG(t: number, n: number) {
  const coeffs = new Array(t + 1).fill(0n).map((_, i) => detScalar(`dkg.coeff.${i}`));
  const msk = coeffs[0]!;
  const mpk = G2Point.generator().mul(msk);
  const alphas: bigint[] = [];
  const msk_k: bigint[] = [];
  const mpk_k: G2Point[] = [];
  for (let k = 1; k <= n; k++) {
    const alpha = BigInt(k);
    let share = 0n;
    let pow = 1n;
    for (let i = 0; i <= t; i++) {
      share = modQ(share + coeffs[i]! * pow);
      pow = modQ(pow * alpha);
    }
    alphas.push(alpha);
    msk_k.push(share);
    mpk_k.push(G2Point.generator().mul(share));
  }
  return { msk, mpk, alphas, msk_k, mpk_k };
}

function generateORCommitments(B: number, trueIndex: number, tag: string) {
  const simulated = new Array<{ e: bigint; z: bigint } | null>(B + 1).fill(null);
  for (let i = 0; i <= B; i++) {
    if (i === trueIndex) continue;
    simulated[i] = {
      e: detScalar(`${tag}.sim.e.${i}`),
      z: detScalar(`${tag}.sim.z.${i}`),
    };
  }
  const w = detScalar(`${tag}.w`);
  return { w, simulated };
}

// ---------- 1. Encrypt ----------

function genEncryptVectors(): void {
  resetRng('encrypt');
  const msk = detScalar('encrypt.msk');
  const mpk = G2Point.generator().mul(msk);
  const m = 5n;
  const r = detScalar('encrypt.r');
  const { ct } = encrypt(m, mpk, r);
  const vec: EncryptVector = {
    name: 'encrypt_m5_basic',
    description:
      'ElGamal encryption of m=5 under a fixed mpk with deterministic randomness r.',
    version: VECTOR_VERSION,
    inputs: {
      mpk: g2ToHex(mpk),
      m: scalarToDec(m),
      r: scalarToDec(r),
    },
    expected: {
      c1: g2ToHex(ct.c1),
      c2: g2ToHex(ct.c2),
    },
  };
  writeVector('encrypt', 'encrypt_m5_basic', vec);
}

// ---------- 2. DLEQ ----------

function genDLEQVectors(): void {
  resetRng('dleq');
  const x = detScalar('dleq.x');
  const base1 = G2Point.generator();
  const base2 = G2Point.generator().mul(detScalar('dleq.base2.rand'));
  const point1 = base1.mul(x);
  const point2 = base2.mul(x);
  const w = detScalar('dleq.w');
  const label = 'vec:dleq:basic';
  const proof = proveDLEQ(
    { base1, base2, point1, point2 },
    { x },
    new Transcript(label),
    { w },
  );
  const ok = verifyDLEQ({ base1, base2, point1, point2 }, proof, new Transcript(label));
  if (!ok) throw new Error('gen-vectors: DLEQ sanity failed');
  const vec: DLEQVector = {
    name: 'dleq_basic',
    description: 'Single DLEQ proof for a two-generator Diffie-Hellman tuple in G2.',
    version: VECTOR_VERSION,
    inputs: {
      base1: g2ToHex(base1),
      base2: g2ToHex(base2),
      point1: g2ToHex(point1),
      point2: g2ToHex(point2),
      transcript_label: label,
      proof: bytesToHex(encodeDLEQ(proof)),
    },
    expected: { verify: true },
  };
  writeVector('dleq', 'dleq_basic', vec);
}

// ---------- 3. OR ----------

function genORVectors(): void {
  resetRng('or');
  const msk = detScalar('or.msk');
  const mpk = G2Point.generator().mul(msk);
  const B = 3;
  const candidates = rangeCandidates(B);
  const trueIndex = 2;
  const m = BigInt(trueIndex);
  const r = detScalar('or.r');
  const { ct } = encrypt(m, mpk, r);
  const commit = generateORCommitments(B, trueIndex, 'or');
  const label = 'vec:or:m2_B3';
  const proof = proveOR(
    { ct, mpk, candidates },
    { r, trueIndex },
    new Transcript(label),
    commit,
  );
  const ok = verifyOR({ ct, mpk, candidates }, proof, new Transcript(label));
  if (!ok) throw new Error('gen-vectors: OR sanity failed');
  const vec: ORVector = {
    name: 'or_m2_B3',
    description:
      '(B+1)-branch OR proof: ct encrypts m=2 from the candidate set {0,1,2,3}.',
    version: VECTOR_VERSION,
    inputs: {
      mpk: g2ToHex(mpk),
      ct: { c1: g2ToHex(ct.c1), c2: g2ToHex(ct.c2) },
      candidates: candidates.map(scalarToDec),
      transcript_label: label,
      or_proof_encoded: bytesToHex(encodeORProof(proof)),
    },
    expected: { verify: true },
  };
  writeVector('or', 'or_m2_B3', vec);
}

// ---------- 4. Budget ----------

function genBudgetVectors(): void {
  resetRng('budget');
  const msk = detScalar('budget.msk');
  const mpk = G2Point.generator().mul(msk);
  const B = 3;

  // exact: votes sum to exactly B. [1,1,1] → sum 3.
  {
    const rs = [
      detScalar('budget.exact.r0'),
      detScalar('budget.exact.r1'),
      detScalar('budget.exact.r2'),
    ];
    const votes = [1n, 1n, 1n];
    const cts: Ciphertext[] = votes.map((v, i) => encrypt(v, mpk, rs[i]!).ct);
    const ctSum = sumCts(cts);
    const rSum = modQ(rs.reduce((a, b) => a + b, 0n));
    const label = 'vec:budget:exact_B3';
    const w = detScalar('budget.exact.w');
    const bproof = proveBudgetExact(
      { mpk, ctSum, budget: BigInt(B) },
      { rSum },
      new Transcript(label),
      { w },
    );
    const ok = verifyBudget(
      { mpk, ctSum, budget: BigInt(B) },
      bproof,
      new Transcript(label),
    );
    if (!ok) throw new Error('gen-vectors: budget-exact sanity failed');
    if (bproof.mode !== 'exact') throw new Error('unexpected budget mode');
    const vec: BudgetVector = {
      name: 'budget_exact_B3',
      description: 'Exact-budget DLEQ: votes [1,1,1] with ΣvI = B = 3.',
      version: VECTOR_VERSION,
      inputs: {
        mpk: g2ToHex(mpk),
        mode: 'exact',
        budget: B,
        ct_sum: { c1: g2ToHex(ctSum.c1), c2: g2ToHex(ctSum.c2) },
        transcript_label: label,
        proof_encoded: bytesToHex(encodeDLEQ(bproof.proof)),
      },
      expected: { verify: true },
    };
    writeVector('budget', 'budget_exact_B3', vec);
  }

  // atMost: V=2 < B. Votes [1,0,1] → sum 2.
  {
    const rs = [
      detScalar('budget.atMost.r0'),
      detScalar('budget.atMost.r1'),
      detScalar('budget.atMost.r2'),
    ];
    const votes = [1n, 0n, 1n];
    const cts: Ciphertext[] = votes.map((v, i) => encrypt(v, mpk, rs[i]!).ct);
    const ctSum = sumCts(cts);
    const rSum = modQ(rs.reduce((a, b) => a + b, 0n));
    const V = 2n;
    const label = 'vec:budget:atMost_B3';
    const commit = generateORCommitments(B, Number(V), 'budget.atMost');
    const bproof = proveBudgetAtMost(
      { mpk, ctSum, budget: BigInt(B) },
      { rSum, V },
      new Transcript(label),
      commit,
    );
    const ok = verifyBudget(
      { mpk, ctSum, budget: BigInt(B) },
      bproof,
      new Transcript(label),
    );
    if (!ok) throw new Error('gen-vectors: budget-atMost sanity failed');
    if (bproof.mode !== 'atMost') throw new Error('unexpected budget mode');
    const vec: BudgetVector = {
      name: 'budget_atMost_B3',
      description: 'At-most-budget OR: votes [1,0,1] with ΣvI = 2 ≤ B = 3.',
      version: VECTOR_VERSION,
      inputs: {
        mpk: g2ToHex(mpk),
        mode: 'atMost',
        budget: B,
        ct_sum: { c1: g2ToHex(ctSum.c1), c2: g2ToHex(ctSum.c2) },
        transcript_label: label,
        proof_encoded: bytesToHex(encodeORProof(bproof.proof)),
      },
      expected: { verify: true },
    };
    writeVector('budget', 'budget_atMost_B3', vec);
  }
}

// ---------- 5. Schnorr ----------

function genSchnorrVectors(): void {
  resetRng('schnorr');
  const sk = detScalar('schnorr.sk');
  const { vk } = schnorrKeygen(sk);
  const msg = new Uint8Array(32);
  for (let i = 0; i < 32; i++) msg[i] = (i * 7 + 3) & 0xff;
  const k = detScalar('schnorr.k');
  const sig = schnorrSign(sk, vk, msg, k);
  const vec: SchnorrVector = {
    name: 'schnorr_basic',
    description: 'Schnorr signature on a 32-byte message with fixed sk and nonce k.',
    version: VECTOR_VERSION,
    inputs: {
      vk: g1ToHex(vk),
      message: bytesToHex(msg),
      sig: bytesToHex(encodeSchnorr(sig)),
    },
    expected: { verify: true },
  };
  writeVector('schnorr', 'schnorr_basic', vec);
}

// ---------- 6. Decrypt share ----------

function genDecryptShareVectors(): void {
  resetRng('share');
  const dkg = simulateDKG(1, 3);
  const r = detScalar('share.r');
  const m = 7n;
  const { ct } = encrypt(m, dkg.mpk, r);
  const label = 'vec:share:basic';
  const keyperIndex = 2;
  const share = partialDecrypt(
    ct,
    dkg.msk_k[keyperIndex - 1]!,
    dkg.mpk_k[keyperIndex - 1]!,
    keyperIndex,
    new Transcript(label),
  );
  const ok = verifyDecryptionShare(
    ct,
    share,
    dkg.mpk_k[keyperIndex - 1]!,
    new Transcript(label),
  );
  if (!ok) throw new Error('gen-vectors: share sanity failed');
  const vec: DecryptShareVector = {
    name: 'share_basic',
    description:
      'Partial decryption share from keyper α=2 over Enc(m=7). The DLEQ inside partialDecrypt uses a fresh nonce, so this file varies across runs but always verifies.',
    version: VECTOR_VERSION,
    inputs: {
      ct_sum: { c1: g2ToHex(ct.c1), c2: g2ToHex(ct.c2) },
      committee_pk: g2ToHex(dkg.mpk_k[keyperIndex - 1]!),
      keyper_index: keyperIndex,
      transcript_label: label,
      share: {
        keyper_index: keyperIndex,
        sigma: g2ToHex(share.sigma),
        dleq_proof: bytesToHex(encodeDLEQ(share.proof)),
      },
    },
    expected: { verify: true },
  };
  writeVector('decrypt-share', 'share_basic', vec);
}

// ---------- 7. Ballot ----------
//
// Mirrors `benchmarks/lib/ballot.ts` but with deterministic randomness
// and inlined so there's exactly one source of truth for the vectors.

function buildBallotDeterministic(opts: {
  mpk: G2Point;
  vk: G1Point;
  sk: bigint;
  electionId: Uint8Array;
  pseudonym: Uint8Array;
  votes: bigint[];
  params: BallotVerifyParams;
  tag: string;
}): { inputs: BallotInputs; ctObjs: Ciphertext[]; zkProof: Uint8Array; sigBytes: Uint8Array } {
  const { mpk, vk, sk, electionId, pseudonym, votes, params, tag } = opts;
  const ℓ = params.numCandidates;
  const B = params.budget;

  // Only Variant A exercised in the generator — keeps vectors tight;
  // Variant B would roughly double the file count without adding new
  // wire shapes the re-verifier hasn't already seen per-branch.
  if (params.variant !== 'A') throw new Error('buildBallotDeterministic: Variant A only');

  const rs: bigint[] = [];
  const cts: Ciphertext[] = [];
  for (let j = 0; j < ℓ; j++) {
    const r = detScalar(`${tag}.r.${j}`);
    rs.push(r);
    cts.push(encrypt(votes[j]!, mpk, r).ct);
  }

  const t = seedBallotTranscript(electionId, mpk, vk, cts, params);

  const candidates = rangeCandidates(B);
  const rangeOrBit: ORProof[] = [];
  for (let j = 0; j < ℓ; j++) {
    t.append('ballot:range', u16BE(j));
    const trueIndex = Number(votes[j]!);
    const commit = generateORCommitments(B, trueIndex, `${tag}.range.${j}`);
    const proof = proveOR(
      { ct: cts[j]!, mpk, candidates },
      { r: rs[j]!, trueIndex },
      t,
      commit,
    );
    rangeOrBit.push(proof);
  }

  const ctSum = sumCts(cts);
  const rSum = modQ(rs.reduce((a, b) => a + b, 0n));

  t.append('ballot:budget', new Uint8Array([0]));
  let budget;
  if (params.mode === 'exact') {
    const w = detScalar(`${tag}.budget.w`);
    budget = proveBudgetExact({ mpk, ctSum, budget: BigInt(B) }, { rSum }, t, { w });
  } else {
    const V = votes.reduce((a, b) => a + b, 0n);
    const commit = generateORCommitments(B, Number(V), `${tag}.budget`);
    budget = proveBudgetAtMost(
      { mpk, ctSum, budget: BigInt(B) },
      { rSum, V },
      t,
      commit,
    );
  }

  const bvp: BallotValidityProof = {
    version: 0x01,
    variant: 'A',
    rangeOrBit,
    budget,
  };
  const zkProof = encodeBallotValidityProof(bvp);

  const ciphertextBytes = cts.map(
    (c) => [c.c1.toBytes(), c.c2.toBytes()] as [Uint8Array, Uint8Array],
  );
  const preimage = canonicalBallotMessage({
    electionId,
    pseudonym,
    ciphertexts: ciphertextBytes,
    zkProof,
  });
  const k = detScalar(`${tag}.sig.k`);
  const sig = schnorrSign(sk, vk, keccak256(preimage, 'bytes'), k);
  const sigBytes = encodeSchnorr(sig);

  return {
    inputs: {
      electionId,
      pseudonym,
      vk: vk.toBytes(),
      ciphertexts: ciphertextBytes,
      zkProof,
      voterSignature: sigBytes,
      wrAttestation: new Uint8Array([0x01]),
    },
    ctObjs: cts,
    zkProof,
    sigBytes,
  };
}

function ballotVectorFromInputs(opts: {
  name: string;
  description: string;
  mpk: G2Point;
  inputs: BallotInputs;
  params: BallotVerifyParams;
  expected: BallotVector['expected'];
}): BallotVector {
  return {
    name: opts.name,
    description: opts.description,
    version: VECTOR_VERSION,
    inputs: {
      mpk: g2ToHex(opts.mpk),
      vk: bytesToHex(opts.inputs.vk),
      election_id: bytesToHex(opts.inputs.electionId),
      pseudonym: bytesToHex(opts.inputs.pseudonym),
      params: opts.params,
      ciphertexts: opts.inputs.ciphertexts.map(([c1, c2]) => ({
        c1: bytesToHex(c1),
        c2: bytesToHex(c2),
      })),
      zkProof: bytesToHex(opts.inputs.zkProof),
      signature: bytesToHex(opts.inputs.voterSignature),
      wr_attestation: bytesToHex(opts.inputs.wrAttestation),
    },
    expected: opts.expected,
  };
}

function genBallotVectors(): void {
  resetRng('ballot');
  const mpkSk = detScalar('ballot.mpkSk');
  const mpk = G2Point.generator().mul(mpkSk);
  const sk = detScalar('ballot.sk');
  const { vk } = schnorrKeygen(sk);
  const electionId = new Uint8Array(32);
  for (let i = 0; i < 32; i++) electionId[i] = 0xe1;
  const pseudonym = new Uint8Array(32);
  for (let i = 0; i < 32; i++) pseudonym[i] = 0x42;

  const accept = () => true;

  // 7a) Variant A exact
  {
    const params: BallotVerifyParams = {
      numCandidates: 3,
      budget: 3,
      mode: 'exact',
      variant: 'A',
    };
    const { inputs } = buildBallotDeterministic({
      mpk,
      vk,
      sk,
      electionId,
      pseudonym,
      votes: [1n, 1n, 1n],
      params,
      tag: 'ballot.exact',
    });
    const r = verifyBallot(inputs, params, mpk, accept);
    if (!r.ok) throw new Error(`gen-vectors: ballot exact failed: ${r.reason}`);
    writeVector(
      'ballot',
      'ballot_variantA_exact',
      ballotVectorFromInputs({
        name: 'ballot_variantA_exact',
        description:
          'Full ballot: Variant A, exact mode, ℓ=3, B=3, votes [1,1,1]. Must verify.',
        mpk,
        inputs,
        params,
        expected: { verify: true },
      }),
    );
  }

  // 7b) Variant A atMost (V=2)
  {
    const params: BallotVerifyParams = {
      numCandidates: 3,
      budget: 3,
      mode: 'atMost',
      variant: 'A',
    };
    const { inputs } = buildBallotDeterministic({
      mpk,
      vk,
      sk,
      electionId,
      pseudonym,
      votes: [1n, 0n, 1n],
      params,
      tag: 'ballot.atMost',
    });
    const r = verifyBallot(inputs, params, mpk, accept);
    if (!r.ok) throw new Error(`gen-vectors: ballot atMost failed: ${r.reason}`);
    writeVector(
      'ballot',
      'ballot_variantA_atMost',
      ballotVectorFromInputs({
        name: 'ballot_variantA_atMost',
        description:
          'Full ballot: Variant A, atMost mode, ℓ=3, B=3, votes [1,0,1] (sum 2 < B).',
        mpk,
        inputs,
        params,
        expected: { verify: true },
      }),
    );
  }

  // 7c) Tampered ciphertext — must reject.
  {
    const params: BallotVerifyParams = {
      numCandidates: 3,
      budget: 3,
      mode: 'exact',
      variant: 'A',
    };
    const { inputs } = buildBallotDeterministic({
      mpk,
      vk,
      sk,
      electionId,
      pseudonym,
      votes: [1n, 1n, 1n],
      params,
      tag: 'ballot.tampered',
    });
    const tampered = inputs.ciphertexts.map(
      ([c1, c2]) => [new Uint8Array(c1), new Uint8Array(c2)] as [Uint8Array, Uint8Array],
    );
    tampered[0]![0]![10]! ^= 0x01;
    const tamperedInputs: BallotInputs = { ...inputs, ciphertexts: tampered };
    const r = verifyBallot(tamperedInputs, params, mpk, accept);
    if (r.ok) throw new Error('gen-vectors: tampered ballot unexpectedly verified');
    writeVector(
      'ballot',
      'ballot_tampered_ct',
      ballotVectorFromInputs({
        name: 'ballot_tampered_ct',
        description:
          'Negative: Variant A exact ballot with one byte flipped in ciphertext[0].c1. Must reject.',
        mpk,
        inputs: tamperedInputs,
        params,
        expected: { verify: false, reason: r.reason },
      }),
    );
  }
}

// ---------- 8. Tally ----------

function genTallyVector(): void {
  resetRng('tally');
  const t = 1;
  const n = 3;
  const dkg = simulateDKG(t, n);
  const ms = [2n, 2n, 3n];
  const rs = [detScalar('tally.r0'), detScalar('tally.r1'), detScalar('tally.r2')];
  const cts: Ciphertext[] = ms.map((m, i) => encrypt(m, dkg.mpk, rs[i]!).ct);
  const ctSum = cts.reduce(
    (acc, ct) => (acc === null ? ct : addCt(acc, ct)),
    null as Ciphertext | null,
  )!;
  const subset = [0, 2]; // keypers α = 1, 3
  const shareObjs = subset.map((k) =>
    partialDecrypt(
      ctSum,
      dkg.msk_k[k]!,
      dkg.mpk_k[k]!,
      k + 1,
      new Transcript(`vec:tally:share:${k + 1}`),
    ),
  );
  for (const [i, k] of subset.entries()) {
    const ok = verifyDecryptionShare(
      ctSum,
      shareObjs[i]!,
      dkg.mpk_k[k]!,
      new Transcript(`vec:tally:share:${k + 1}`),
    );
    if (!ok) throw new Error('gen-vectors: tally share sanity failed');
  }
  const alphas = subset.map((k) => dkg.alphas[k]!);
  const tau = combineShares(shareObjs, alphas, ctSum);
  const V = ms.reduce((a, b) => a + b, 0n);
  const expected = G2Point.generator().mul(V);
  if (!tau.equals(expected)) throw new Error('gen-vectors: tally combined τ mismatch');
  const vec: TallyVector = {
    name: 'tally_basic',
    description:
      't=1, n=3 threshold decrypt of Σ Enc(mᵢ) for ms=[2,2,3] → V=7. Uses shares from α=1 and α=3. partialDecrypt DLEQ nonces are non-reproducible, so this file varies across runs but always verifies.',
    version: VECTOR_VERSION,
    inputs: {
      ct_sum: { c1: g2ToHex(ctSum.c1), c2: g2ToHex(ctSum.c2) },
      committee_pks: dkg.mpk_k.map(g2ToHex),
      alphas: alphas.map(scalarToDec),
      upper_bound: scalarToDec(10n),
      shares: shareObjs.map((s) => ({
        keyper_index: s.keyperIndex,
        sigma: g2ToHex(s.sigma),
        dleq_proof: bytesToHex(encodeDLEQ(s.proof)),
      })),
    },
    expected: { V: scalarToDec(V) },
  };
  writeVector('tally', 'tally_basic', vec);
}

// ---------- Entry point ----------

async function main(): Promise<void> {
  await initCurves();
  mkdirSync(OUT_DIR, { recursive: true });
  // eslint-disable-next-line no-console
  console.log(`Writing vectors to ${OUT_DIR}`);
  genEncryptVectors();
  genDLEQVectors();
  genORVectors();
  genBudgetVectors();
  genSchnorrVectors();
  genDecryptShareVectors();
  genBallotVectors();
  genTallyVector();
  // eslint-disable-next-line no-console
  console.log('Done.');
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
