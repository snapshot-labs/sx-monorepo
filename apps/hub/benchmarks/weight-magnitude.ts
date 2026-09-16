/**
 * How much does removing the weight clamp cost?
 *
 * Weights used to be capped at `floor(1e6 / budget)` — 10,000 at budget 100, so
 * 14 bits. They are not capped any more, and a live run has already produced
 * 995,500 (20 bits); a large ERC-20 holder can reach 40+ bits. Nothing measured
 * what that does to aggregation: `sx-election-scale.ts` cycles `vp` through 1..5,
 * three orders of magnitude below what the system now admits, so its aggregation
 * numbers describe the clamped world.
 *
 * It matters because of how the MSM is structured (`crypto/msm.ts`):
 *
 *     c          = window bits, from log2(n) — fixed for a given chunk size
 *     numWindows = ceil(maxBitLength(scalars) / c)
 *
 * Bucket reduction runs once per window, so cost should be **roughly linear in the
 * bit length of the largest scalar in the chunk**, not in its value. That is a
 * falsifiable prediction and this benchmark is mostly here to check it: 40-bit
 * weights should cost about 3x what 14-bit weights do, not 2^26 times.
 *
 * Windows are sized by the largest scalar in the chunk, which suggested one whale
 * would make all 256 ballots pay whale prices. **Measured, that is false**, and the
 * mixed row at the end is what showed it: 255 small weights plus one 1e15 whale cost
 * 156 ms, against 457 ms when every weight is 1e15. `msmG2` skips zero digits, so
 * the extra high windows a whale forces are traversed with only the whale in them.
 * Per-window cost tracks how many points have a non-zero digit there, not the chunk
 * size. A realistic cap table -- one large holder, a long tail of small ones -- is
 * therefore much closer to the cheap case than to the expensive one.
 *
 * The second thing measured here is the MSM speedup itself. The weight-scaling plan
 * claims 11-21x over the naive `scalarMulCt` + `addCt` loop; that number came from a
 * one-off run and lives only in prose. Both paths are run over identical inputs so
 * the ratio is reproducible.
 *
 * That claim turns out to be **regime-dependent, and it was measured in the clamped
 * world**: 22x at the old 1e4 ceiling, but only 4.5x at 1e15. The naive loop costs a
 * flat ~2.1 s whatever the scalar, because `scalarMulCt` is a constant-time
 * full-width multiply; MSM is the only one of the two that gets cheaper on small
 * scalars, so unclamping erodes its advantage. Still a win everywhere, just a
 * smaller one than the plan implies.
 *
 * Chunk size is 256 to match `teVerify.aggregateBallots`, which is the code this is
 * a proxy for.
 *
 *   bun run benchmarks/weight-magnitude.ts
 */

import {
  addCt,
  BallotVerifyParams,
  buildBallot,
  Ciphertext,
  G2Point,
  initCurves,
  msmCt,
  scalarMulCt,
  schnorrKeygen
} from '@shutter-network/urban-verified-crypto';

const Q = 0x73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001n;
function randomScalar(): bigint {
  const b = new Uint8Array(48);
  crypto.getRandomValues(b);
  let v = 0n;
  for (const byte of b) v = (v << 8n) | BigInt(byte);
  return v % Q;
}

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';
const pass = (m: string) => console.log(`${GREEN}✓${RESET} ${m}`);
const info = (m: string) => console.log(`${YELLOW}→${RESET} ${m}`);

const PARAMS: BallotVerifyParams = {
  numCandidates: 3,
  budget: 100,
  mode: 'exact',
  variant: 'A'
};

/** Matches `teVerify.aggregateBallots`. */
const CHUNK = 256;
/** Repeats per row. Enough for a stable mean without making the run tedious. */
const REPEATS = 5;

/**
 * Weight regimes, chosen to be the ones that actually occur rather than round
 * numbers: the old clamp, the live figures from `erc20.eth`, and the magnitudes a
 * real token reaches.
 */
const REGIMES: { label: string; sample: () => bigint }[] = [
  { label: 'w = 1 (ticket / whitelist)', sample: () => 1n },
  {
    label: 'w ~ 1e4 (the OLD clamp ceiling)',
    sample: () => randIn(9_000n, 10_000n)
  },
  {
    label: 'w ~ 1e6 (live: 995,500 holder)',
    sample: () => randIn(900_000n, 1_000_000n)
  },
  { label: 'w ~ 1e9', sample: () => randIn(9n * 10n ** 8n, 10n ** 9n) },
  {
    label: 'w ~ 1e12 (fallback-bound scale)',
    sample: () => randIn(9n * 10n ** 11n, 10n ** 12n)
  },
  {
    label: 'w ~ 1e15 (large-supply token)',
    sample: () => randIn(9n * 10n ** 14n, 10n ** 15n)
  }
];

function randIn(lo: bigint, hi: bigint): bigint {
  const span = hi - lo + 1n;
  return lo + (randomScalar() % span);
}

function bitsOf(scalars: bigint[]): number {
  let max = 0n;
  for (const s of scalars) if (s > max) max = s;
  return max === 0n ? 0 : max.toString(2).length;
}

/** The window count `msmG2` will derive for this chunk — reported, not assumed. */
function windowsFor(
  scalars: bigint[],
  n: number
): { c: number; windows: number } {
  const c = n <= 1 ? 1 : Math.max(2, Math.min(8, Math.floor(Math.log2(n))));
  return { c, windows: Math.ceil(bitsOf(scalars) / c) };
}

function freshCts(template: [Uint8Array, Uint8Array][]): Ciphertext[] {
  return template.map(([c1, c2]) => ({
    c1: G2Point.fromBytes(c1),
    c2: G2Point.fromBytes(c2)
  }));
}

function freeCts(cts: Ciphertext[]): void {
  for (const ct of cts) {
    ct.c1.destroyWasm();
    ct.c2.destroyWasm();
  }
}

/** One candidate's column, the way `aggregateBallots` calls it. */
function timeMsm(weights: bigint[], column: Ciphertext[]): number {
  const t0 = performance.now();
  const out = msmCt(weights, column);
  const ms = performance.now() - t0;
  out.c1.destroyWasm();
  out.c2.destroyWasm();
  return ms;
}

/** The pre-MSM path, kept only as the baseline the speedup claim is measured against. */
function timeNaive(weights: bigint[], column: Ciphertext[]): number {
  const t0 = performance.now();
  let acc: Ciphertext | null = null;
  for (let i = 0; i < column.length; i++) {
    const w = weights[i]!;
    const weighted = w === 1n ? column[i]! : scalarMulCt(w, column[i]!);
    if (acc === null) {
      acc = weighted;
    } else {
      const prev = acc;
      acc = addCt(prev, weighted);
      prev.c1.destroyWasm();
      prev.c2.destroyWasm();
      if (w !== 1n) {
        weighted.c1.destroyWasm();
        weighted.c2.destroyWasm();
      }
    }
  }
  const ms = performance.now() - t0;
  if (acc) {
    acc.c1.destroyWasm();
    acc.c2.destroyWasm();
  }
  return ms;
}

const median = (xs: number[]) =>
  [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;

async function main(): Promise<void> {
  await initCurves();
  info('curves initialised');

  const sk = randomScalar();
  const mpk = G2Point.generator().mul(sk);
  const electionId = new Uint8Array(32).fill(7);
  const { sk: voterSk, vk } = schnorrKeygen();
  const pseudonym = new Uint8Array(32);
  pseudonym[31] = 1;

  info('building one real ballot to source ciphertexts from...');
  const ballot = buildBallot({
    mpk,
    electionId,
    pseudonym,
    sk: voterSk,
    vk,
    votes: [34n, 33n, 33n],
    params: PARAMS,
    attestation: {
      electionId: new Uint8Array(32).fill(1),
      pseudonym: new Uint8Array(32).fill(2),
      vk: new Uint8Array(48).fill(3),
      weight: 1n,
      nonce: 1n,
      signature: new Uint8Array(80)
    }
  });
  const template = ballot.ciphertexts as [Uint8Array, Uint8Array][];
  pass(`ballot built (ℓ=${PARAMS.numCandidates}, B=${PARAMS.budget})`);

  console.log();
  console.log(
    `${BOLD}Aggregating one candidate column of ${CHUNK} ballots, ${REPEATS} repeats, median reported.${RESET}`
  );
  console.log(
    'MSM is what teVerify runs; naive is the pre-MSM loop, for the speedup ratio only.'
  );
  console.log();
  console.log(
    `${BOLD}regime                            bits  win   MSM ms   naive ms  speedup  vs w=1${RESET}`
  );

  const rows: { label: string; bits: number; msm: number }[] = [];
  let baseline: number | null = null;

  for (const regime of REGIMES) {
    const weights = Array.from({ length: CHUNK }, regime.sample);
    const { windows } = windowsFor(weights, CHUNK);
    const bits = bitsOf(weights);

    const msmTimes: number[] = [];
    const naiveTimes: number[] = [];
    for (let r = 0; r < REPEATS; r++) {
      const col = freshCts(
        Array.from({ length: CHUNK }, (_, i) => template[i % template.length]!)
      );
      msmTimes.push(timeMsm(weights, col));
      freeCts(col);

      const col2 = freshCts(
        Array.from({ length: CHUNK }, (_, i) => template[i % template.length]!)
      );
      naiveTimes.push(timeNaive(weights, col2));
      freeCts(col2);
    }

    const msm = median(msmTimes);
    const naive = median(naiveTimes);
    if (baseline === null) baseline = msm;
    rows.push({ label: regime.label, bits, msm });

    console.log(
      `${regime.label.padEnd(33)} ${String(bits).padStart(4)} ${String(windows).padStart(4)} ` +
        `${msm.toFixed(1).padStart(8)} ${naive.toFixed(1).padStart(10)} ` +
        `${(naive / msm).toFixed(1).padStart(7)}x ${(msm / baseline).toFixed(2).padStart(6)}x`
    );
  }

  // One whale in an otherwise small chunk. Windows are sized by the maximum, so
  // this should cost the same as a chunk where *every* weight is that large --
  // which is the practically important consequence of the model.
  console.log();
  const mixed = Array.from({ length: CHUNK }, () => randIn(1n, 100n));
  mixed[0] = randIn(9n * 10n ** 14n, 10n ** 15n);
  const { windows: mw } = windowsFor(mixed, CHUNK);
  const mixedTimes: number[] = [];
  for (let r = 0; r < REPEATS; r++) {
    const col = freshCts(
      Array.from({ length: CHUNK }, (_, i) => template[i % template.length]!)
    );
    mixedTimes.push(timeMsm(mixed, col));
    freeCts(col);
  }
  console.log(
    `${'255 small weights + ONE 1e15 whale'.padEnd(33)} ${String(bitsOf(mixed)).padStart(4)} ${String(mw).padStart(4)} ` +
      `${median(mixedTimes).toFixed(1).padStart(8)}`
  );

  console.log();
  const first = rows[1]!; // the old clamp ceiling
  const last = rows[rows.length - 1]!;
  const bitRatio = last.bits / first.bits;
  const costRatio = last.msm / first.msm;
  info(
    `bit length ${first.bits} -> ${last.bits} is ${bitRatio.toFixed(2)}x; ` +
      `cost ${first.msm.toFixed(1)}ms -> ${last.msm.toFixed(1)}ms is ${costRatio.toFixed(2)}x`
  );
  info(
    'Linear-in-bits predicts those two ratios match. A large gap means the model ' +
      'is wrong and the cost of unclamping is not what the plan assumes.'
  );
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
