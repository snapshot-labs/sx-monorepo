/**
 * The committee-owned aggregate, end to end against the database.
 *
 * This is the write that takes the tally away from a single writer. Under the
 * old design the sequencer summed the ballots alone, which meant it could quietly
 * omit one and nothing downstream could tell. Here every keyper derives the
 * aggregate independently from the same ballots and the same config, and the
 * artifact only becomes canonical when a quorum of them submits it
 * **byte-identically** — so isolating a ballot now requires corrupting a majority
 * of the committee rather than one process.
 *
 * The rules exercised below are the protocol's, taken from its own reference
 * store rather than invented here. Three are easy to get subtly wrong:
 *
 *   - a submission before voting closes is a 422, not a 400 — the client retries
 *     one and abandons the other;
 *   - a keyper may **replace** its own submission until the quorum forms, because
 *     the aggregate is a deterministic re-derivation and the coordinator asks the
 *     committee to redo it when they disagree. Freezing it on first write would
 *     make a transient disagreement permanent;
 *   - two different aggregates each reaching the quorum is a 409, not a race to
 *     pick one — the winner would otherwise depend on row order.
 */

import { Wallet } from '@ethersproject/wallet';
import fetch from 'node-fetch';
import { aggregateDigest } from '../../src/helpers/gegDigests';
import db from '../../src/helpers/mysql';

const HOST = `http://localhost:${process.env.PORT || 3030}`;

// Deterministic committee: the addresses in the frozen config are derived from
// these, so a signature recovers to a known index.
const KEYPERS = [
  new Wallet(`0x${'11'.repeat(32)}`),
  new Wallet(`0x${'22'.repeat(32)}`),
  new Wallet(`0x${'33'.repeat(32)}`)
];
const OUTSIDER = new Wallet(`0x${'44'.repeat(32)}`);

const CLOSED =
  '0xaaaa000000000000000000000000000000000000000000000000000000000001';
const OPEN =
  '0xaaaa000000000000000000000000000000000000000000000000000000000002';

function committee(quorum: number) {
  return {
    v: 1,
    keypers: KEYPERS.map((w, i) => ({
      address: w.address,
      url: `https://k${i + 1}.example`
    })),
    thresholdT: quorum,
    thresholdN: KEYPERS.length,
    eligibilityKey: `0x${'ab'.repeat(48)}`,
    resultPublisherAddress: OUTSIDER.address,
    adminAddress: OUTSIDER.address,
    votingStart: 1,
    votingEnd: 2,
    weightedBudget: 100
  };
}

/** An aggregate envelope; `tweak` makes a keyper's derivation differ. */
function artifact(electionId: string, tweak = 0) {
  return {
    electionId,
    aggregates: [
      { c1: `0x${'aa'.repeat(96)}`, c2: `0x${'bb'.repeat(96)}` },
      { c1: `0x${'cc'.repeat(96)}`, c2: `0x${'dd'.repeat(96)}` }
    ],
    admitted: tweak === 0 ? [0, 1] : [0],
    exclusions:
      tweak === 0 ? [] : [{ sequenceNumber: 1, reason: 'INVALID_PROOF' }],
    totalAdmittedWeight: tweak === 0 ? 2 : 1,
    totalScaledWeight: tweak === 0 ? 2 : 1
  };
}

async function submit(
  proposalId: string,
  wallet: Wallet,
  aggregate: ReturnType<typeof artifact>
) {
  const digest = aggregateDigest({
    electionId: proposalId,
    aggregates: aggregate.aggregates,
    admitted: aggregate.admitted,
    exclusions: aggregate.exclusions,
    totalAdmittedWeight: aggregate.totalAdmittedWeight,
    totalScaledWeight: aggregate.totalScaledWeight
  });
  const keyperSig = await wallet.signMessage(digest);
  const res = await fetch(`${HOST}/api/proposal/${proposalId}/te_aggregate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ aggregate, keyperSig })
  });
  return res.status;
}

async function canonical(proposalId: string) {
  const res = await fetch(
    `${HOST}/api/proposal/${proposalId}/te_geg_aggregate`
  );
  return (await res.json()).aggregate;
}

async function seed(id: string, endsAt: number, quorum = 2) {
  await db.queryAsync(
    'DELETE FROM te_aggregate_submissions WHERE proposal_id = ?',
    [id]
  );
  await db.queryAsync('DELETE FROM proposals WHERE id = ?', [id]);
  await db.queryAsync('INSERT INTO proposals SET ?', {
    id,
    ipfs: 'bafkreiaggregatequorumfixture',
    author: OUTSIDER.address,
    created: 1,
    space: 'test.eth',
    network: '1',
    symbol: '',
    type: 'weighted',
    strategies: '[]',
    validation: '{}',
    plugins: '{}',
    title: 'aggregate quorum',
    body: '',
    discussion: '',
    choices: JSON.stringify(['Yes', 'No']),
    labels: null,
    start: 1,
    end: endsAt,
    quorum: 0,
    quorum_type: '',
    privacy: 'shutter-elgamal',
    snapshot: 1,
    app: '',
    scores: '[]',
    scores_by_strategy: '[]',
    scores_state: 'pending',
    scores_total: 0,
    scores_updated: 0,
    vp_value_by_strategy: '[]',
    votes: 0,
    // A private proposal always has its ballot shape stored — it is written at
    // creation and rewritten on every edit. The election read asserts it agrees
    // with the budget the committee will verify against, because a disagreement
    // rejects every ballot as INVALID_PROOF and publishes a tally of zeros.
    te_config: JSON.stringify({
      numCandidates: 2,
      budget: 100,
      mode: 'exact',
      variant: 'A'
    }),
    te_geg_config: JSON.stringify(committee(quorum))
  });
}

const FUTURE = Math.floor(Date.now() / 1000) + 3600;

describe('POST /api/proposal/:id/te_aggregate', () => {
  beforeAll(async () => {
    await seed(CLOSED, 2);
    await seed(OPEN, FUTURE);
  });

  afterAll(async () => {
    for (const id of [CLOSED, OPEN]) {
      await db.queryAsync(
        'DELETE FROM te_aggregate_submissions WHERE proposal_id = ?',
        [id]
      );
      await db.queryAsync('DELETE FROM proposals WHERE id = ?', [id]);
    }
    await db.endAsync();
  });

  beforeEach(async () => {
    await db.queryAsync(
      'DELETE FROM te_aggregate_submissions WHERE proposal_id = ?',
      [CLOSED]
    );
    await db.queryAsync(
      'UPDATE proposals SET te_aggregate = NULL WHERE id = ?',
      [CLOSED]
    );
  });

  it('refuses an aggregate over a ballot set that is still open', async () => {
    expect(await submit(OPEN, KEYPERS[0], artifact(OPEN))).toBe(422);
    expect(await canonical(OPEN)).toBeNull();
  });

  it('refuses a submission from outside the committee', async () => {
    expect(await submit(CLOSED, OUTSIDER, artifact(CLOSED))).toBe(403);
    expect(await canonical(CLOSED)).toBeNull();
  });

  it('records the first submission without making it canonical', async () => {
    expect(await submit(CLOSED, KEYPERS[0], artifact(CLOSED))).toBe(204);
    expect(await canonical(CLOSED)).toBeNull();
  });

  it('promotes the artifact once a quorum submits it byte-identically', async () => {
    await submit(CLOSED, KEYPERS[0], artifact(CLOSED));
    expect(await canonical(CLOSED)).toBeNull();

    expect(await submit(CLOSED, KEYPERS[1], artifact(CLOSED))).toBe(204);

    const agg = await canonical(CLOSED);
    expect(agg).toMatchObject({
      admitted: [0, 1],
      exclusions: [],
      totalAdmittedWeight: 2,
      totalScaledWeight: 2
    });
  });

  // The Phase 3 exit criterion: a keyper that derived something different is
  // recorded, so an auditor can see the disagreement, but never counts toward
  // the quorum of the artifact the others agreed on.
  it('records a divergent keyper without letting it reach the quorum', async () => {
    expect(await submit(CLOSED, KEYPERS[0], artifact(CLOSED, 1))).toBe(204);
    expect(await submit(CLOSED, KEYPERS[1], artifact(CLOSED))).toBe(204);
    expect(await canonical(CLOSED)).toBeNull();

    const rows = await db.queryAsync(
      'SELECT keyper_index, digest FROM te_aggregate_submissions WHERE proposal_id = ? ORDER BY keyper_index',
      [CLOSED]
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].digest).not.toBe(rows[1].digest);

    // …and the moment a second keyper agrees with either one, that one wins.
    expect(await submit(CLOSED, KEYPERS[2], artifact(CLOSED))).toBe(204);
    expect(await canonical(CLOSED)).not.toBeNull();
  });

  it('treats an identical resend as a no-op', async () => {
    expect(await submit(CLOSED, KEYPERS[0], artifact(CLOSED))).toBe(204);
    expect(await submit(CLOSED, KEYPERS[0], artifact(CLOSED))).toBe(204);
    const [{ c }] = await db.queryAsync(
      'SELECT COUNT(*) AS c FROM te_aggregate_submissions WHERE proposal_id = ?',
      [CLOSED]
    );
    expect(Number(c)).toBe(1);
  });

  // Mutability before the quorum is what lets a committee re-converge. The
  // coordinator asks for exactly this when it sees submissions disagree.
  it('lets a keyper replace its own aggregate while no quorum exists', async () => {
    expect(await submit(CLOSED, KEYPERS[0], artifact(CLOSED, 1))).toBe(204);
    expect(await submit(CLOSED, KEYPERS[0], artifact(CLOSED))).toBe(204);

    const rows = await db.queryAsync(
      'SELECT keyper_index FROM te_aggregate_submissions WHERE proposal_id = ?',
      [CLOSED]
    );
    expect(rows).toHaveLength(1); // replaced, not appended

    expect(await submit(CLOSED, KEYPERS[1], artifact(CLOSED))).toBe(204);
    expect(await canonical(CLOSED)).not.toBeNull();
  });

  it('freezes the set once the quorum has spoken', async () => {
    await submit(CLOSED, KEYPERS[0], artifact(CLOSED));
    await submit(CLOSED, KEYPERS[1], artifact(CLOSED));
    expect(await canonical(CLOSED)).not.toBeNull();

    expect(await submit(CLOSED, KEYPERS[0], artifact(CLOSED, 1))).toBe(409);

    // The canonical artifact is unchanged by the attempt.
    expect(await canonical(CLOSED)).toMatchObject({ admitted: [0, 1] });
  });
});
