/**
 * Seed a synthetic private proposal with mixed voting power, and compute the
 * aggregate the legacy sequencer would produce for it.
 *
 * The real proposal in a dev database typically has a single vote at vp = 1, which
 * exercises only the degenerate weight-1 path. Weights above 1 are where the two
 * implementations could actually diverge: legacy short-circuits weight 1 and calls
 * `scalarMulCt` otherwise, geg always scalar-multiplies. This produces ballots at
 * several weights so that path is compared for real.
 *
 * It writes a *new* proposal rather than adding votes to an existing one. A ballot's
 * election id is bound into its canonical signed message and its proof transcript,
 * so an existing envelope cannot be replayed under another proposal — every ballot
 * here has to be built fresh anyway, and keeping the real artifact untouched leaves
 * it as an independent anchor.
 *
 * One vote is deliberately dust (vp below 0.5, rounding to weight 0). Legacy skips
 * zero-weight ballots when aggregating; the hub omits them from what it serves to
 * the keypers. Both must therefore reach the same aggregate, which is what makes
 * the dust rule safe rather than merely convenient.
 *
 * Output is a JSON file for the seeding step — this script touches no database.
 *
 * Lives here rather than beside the other geg tooling in scripts/geg/ purely so
 * that Bun resolves the crypto SDK and ethers from this app's node_modules.
 *
 *   cd apps/hub && bun run scripts/seed-mixed-vp-proposal.ts <mpk-hex> <out.json>
 */

import { writeFileSync } from 'node:fs';
import { keccak256 } from '@ethersproject/keccak256';
import {
  addCt,
  buildBallot,
  Ciphertext,
  G2Point,
  initCurves,
  scalarMulCt,
  schnorrKeygen,
  verifyBallot
} from '@shutter-network/urban-verified-crypto';

/** Matches the real proposal's shape: 3 candidates, weighted, budget 100. */
const PARAMS = {
  numCandidates: 3,
  budget: 100,
  mode: 'exact' as const,
  variant: 'A' as const
};

/**
 * Voting powers chosen to cover the cases that behave differently:
 * 1 is the short-circuit path, 2/3/5 exercise scalar multiplication, and 0.4
 * rounds to zero so both sides must drop it.
 */
const VOTERS = [
  { vp: 1, votes: [60n, 20n, 20n] },
  { vp: 2, votes: [50n, 30n, 20n] },
  { vp: 3, votes: [34n, 33n, 33n] },
  { vp: 5, votes: [100n, 0n, 0n] },
  { vp: 0.4, votes: [10n, 10n, 80n] } // dust: round(0.4) === 0
];

function hex(b: Uint8Array): string {
  return `0x${Buffer.from(b).toString('hex')}`;
}

/** Deterministic 20-byte address from an index, so runs are reproducible. */
function voterAddress(i: number): string {
  return `0x${(i + 1).toString(16).padStart(2, '0').repeat(20)}`;
}

/** The sequencer's construction: keccak256(voter_lowercase ‖ proposalId). */
function pseudonymFor(voter: string, proposalId: string): string {
  const a = Buffer.from(voter.toLowerCase().slice(2), 'hex');
  const b = Buffer.from(proposalId.slice(2), 'hex');
  return keccak256(Buffer.concat([a, b]));
}

async function main() {
  const mpkHex = process.argv[2];
  const outPath = process.argv[3];
  const targetId = process.argv[4];
  if (!mpkHex || !outPath) {
    console.error(
      'usage: bun run scripts/seed-mixed-vp-proposal.ts <mpk-hex> <out.json> [proposal-id]'
    );
    process.exit(2);
  }

  await initCurves();

  // A fixed synthetic id, so re-running replaces the same row instead of
  // accumulating proposals.
  const proposalId = targetId || `0x${'5e'.repeat(32)}`;
  const mpk = G2Point.fromBytes(
    new Uint8Array(Buffer.from(mpkHex.replace(/^0x/, ''), 'hex'))
  );

  const now = Math.floor(Date.now() / 1000);
  // A window already closed, so the proposal is in its tally phase immediately.
  const votingStart = now - 7200;
  const votingEnd = now - 3600;

  const rows: any[] = [];
  const forAggregate: Array<{ choice: string; vp: number }> = [];

  for (let i = 0; i < VOTERS.length; i++) {
    const { vp, votes } = VOTERS[i]!;
    const voter = voterAddress(i);
    const pseudonym = pseudonymFor(voter, proposalId);
    const { sk, vk } = schnorrKeygen();

    const sum = votes.reduce((a, b) => a + b, 0n);
    if (sum !== BigInt(PARAMS.budget)) {
      throw new Error(
        `voter ${i}: votes sum to ${sum}, expected ${PARAMS.budget}`
      );
    }

    process.stderr.write(
      `building ballot ${i + 1}/${VOTERS.length} (vp=${vp}, votes=[${votes}])… `
    );
    const built = buildBallot({
      mpk,
      electionId: new Uint8Array(Buffer.from(proposalId.slice(2), 'hex')),
      pseudonym: new Uint8Array(Buffer.from(pseudonym.slice(2), 'hex')),
      sk,
      vk,
      votes,
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

    // Never emit a ballot the ingest path would reject; a bad ballot here would
    // surface later as an unexplained admission exclusion.
    const check = verifyBallot(built, PARAMS, mpk, new Uint8Array(48));
    if (!check.ok)
      throw new Error(`voter ${i}: self-check failed: ${check.reason}`);
    process.stderr.write('ok\n');

    const envelope = {
      electionId: proposalId,
      pseudonym,
      vk: hex(built.vk),
      ciphertexts: built.ciphertexts.map(([c1, c2]) => ({
        c1: hex(c1),
        c2: hex(c2)
      })),
      zkProof: hex(built.zkProof),
      voterSignature: hex(built.voterSignature)
    };

    const choice = JSON.stringify(envelope);
    rows.push({
      id: keccak256(Buffer.from(`${proposalId}:${voter}`)),
      voter,
      vp,
      created: votingStart + 60 + i, // strictly increasing, so ordering is total
      choice
    });
    forAggregate.push({ choice, vp });
    vk.destroyWasm();
  }

  // The legacy aggregation, reproduced exactly: skip zero weight, reuse the
  // ciphertext at weight 1, scalar-multiply above that, sum per candidate.
  const acc: Array<Ciphertext | null> = new Array(PARAMS.numCandidates).fill(
    null
  );
  let totalVp = 0n;
  for (const { choice, vp } of forAggregate) {
    const w = BigInt(Math.round(vp));
    if (w === 0n) continue;
    totalVp += w;
    const env = JSON.parse(choice);
    for (let j = 0; j < PARAMS.numCandidates; j++) {
      const raw: Ciphertext = {
        c1: G2Point.fromBytes(
          new Uint8Array(Buffer.from(env.ciphertexts[j].c1.slice(2), 'hex'))
        ),
        c2: G2Point.fromBytes(
          new Uint8Array(Buffer.from(env.ciphertexts[j].c2.slice(2), 'hex'))
        )
      };
      const weighted = w === 1n ? raw : scalarMulCt(w, raw);
      if (w !== 1n) {
        raw.c1.destroyWasm();
        raw.c2.destroyWasm();
      }
      const prev = acc[j];
      if (prev === null) {
        acc[j] = weighted;
      } else {
        acc[j] = addCt(prev, weighted);
        prev.c1.destroyWasm();
        prev.c2.destroyWasm();
        weighted.c1.destroyWasm();
        weighted.c2.destroyWasm();
      }
    }
  }

  const aggregate = {
    election_id: proposalId,
    num_candidates: PARAMS.numCandidates,
    ciphertexts: acc.map(ct => ({
      c1: hex(ct!.c1.toBytes()),
      c2: hex(ct!.c2.toBytes())
    }))
  };

  writeFileSync(
    outPath,
    `${JSON.stringify(
      {
        proposalId,
        mpk: mpkHex,
        params: PARAMS,
        votingStart,
        votingEnd,
        totalVp: totalVp.toString(),
        expectedBsgsBound: (BigInt(PARAMS.budget) * totalVp).toString(),
        votes: rows,
        aggregate
      },
      null,
      2
    )}\n`
  );

  mpk.destroyWasm();
  console.error(
    `\nwrote ${outPath}: ${rows.length} votes, ` +
      `${forAggregate.filter(v => Math.round(v.vp) > 0).length} aggregated, ` +
      `totalVp=${totalVp}`
  );
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
