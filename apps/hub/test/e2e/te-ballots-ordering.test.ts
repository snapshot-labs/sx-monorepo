/**
 * `/te_ballots` and `/te_geg_ballots` must agree on ballot order.
 *
 * They read the same rows under the same filter, for two different readers: the
 * committee pages `te_geg_ballots` and expresses admission and exclusion as
 * *positions* in that order, while the audit panel reads `te_ballots` and
 * recomputes the aggregate from it. An auditor can only line the committee's
 * `admitted`/`exclusions` up against real ballots if the two lists are the same
 * list — so the ordering is a contract between the endpoints, not an internal
 * detail of either.
 *
 * `te_ballots` ordered by `created ASC` alone. `created` is a second-resolution
 * timestamp and not a total order, so two ballots cast in the same second could
 * come back either way round — and MySQL is under no obligation to be consistent
 * between the two queries, or between two calls of the same one. Sequence number
 * 3 could mean different ballots to the committee and to the panel.
 *
 * This is the ordering gap that has to close before M-4 can map exclusions onto
 * ballots at all.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import fetch from 'node-fetch';
import { eligibilityPublicKey } from '../../src/helpers/eligibilityKey';
import db from '../../src/helpers/mysql';
import { seedEligibilityKey } from '../fixtures/eligibilityKey';

const HOST = `http://localhost:${process.env.PORT || 3030}`;
const ID = '0xaaab000000000000000000000000000000000000000000000000000000000001';
const NUM_CANDIDATES = 2;

// Deliberately tied in the middle, and inserted with voters that invert the
// natural id order, so the fixture would expose a reorder if one were possible.
const CREATED_AT = [100, 200, 200, 200, 300];

// Distinct per ballot, so a positional comparison can actually tell them apart.
// With identical envelopes the two lists would match in any order.
function envelope(i: number) {
  return JSON.stringify({
    v: 1,
    pseudonym: `0x${String(i).padStart(2, '0').repeat(32)}`,
    vk: `0x${String(i).padStart(2, '0').repeat(48)}`,
    ciphertexts: Array.from({ length: NUM_CANDIDATES }, (_, j) => ({
      c1: `0x${String(i * 10 + j)
        .padStart(2, '0')
        .repeat(96)}`,
      c2: `0x${String(i * 10 + j)
        .padStart(2, '0')
        .repeat(96)}`
    })),
    // The geg feed reads the credential and the binding out of the envelope, so
    // a fixture without them is a ballot it refuses to serve.
    attestation: {
      scheme: 'ATTESTATION_V1',
      electionId: ID,
      pseudonym: `0x${String(i).padStart(2, '0').repeat(32)}`,
      vk: `0x${String(i).padStart(2, '0').repeat(48)}`,
      // Matches the row's `vp` below: the audit feed reports voting power and the
      // committee feed reports the attested weight, and the positional check
      // compares them, so a fixture where they disagree tests nothing.
      weight: i + 1,
      nonce: i + 1,
      signature: `0x${'ab'.repeat(80)}`
    }
  });
}

async function seed(): Promise<void> {
  // Publish it first: `eligibilityPublicKey` reads the row, and depending on
  // another suite to have written it makes this one order-dependent.
  await seedEligibilityKey();
  const eligibilityKey = await eligibilityPublicKey();
  await db.queryAsync('DELETE FROM proposals WHERE id = ?', [ID]);
  await db.queryAsync('DELETE FROM votes WHERE proposal = ?', [ID]);
  await db.queryAsync('INSERT INTO proposals SET ?', {
    id: ID,
    ipfs: 'bafkreiorderfixture',
    author: `0x${'e5'.repeat(20)}`,
    created: 1,
    space: 'test.eth',
    network: '1',
    symbol: '',
    type: 'weighted',
    strategies: '[]',
    validation: '{}',
    plugins: '{}',
    title: 'ordering fixture',
    body: '',
    discussion: '',
    choices: JSON.stringify(['Yes', 'No']),
    start: 1,
    end: 2,
    quorum: 0,
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
    te_mpk: Buffer.alloc(96, 0xab),
    te_config: JSON.stringify({
      numCandidates: NUM_CANDIDATES,
      budget: 100,
      mode: 'exact',
      variant: 'A'
    }),
    te_geg_config: JSON.stringify({
      v: 1,
      // A real committee: parseCommitteeSnapshot refuses an empty one, and the
      // geg route resolves the config before it ever reaches the ballots.
      keypers: [1, 2, 3].map(i => ({
        address: `0x${String(i).repeat(40)}`,
        url: `https://k${i}.example`
      })),
      thresholdT: 2,
      thresholdN: 3,
      eligibilityKey,
      resultPublisherAddress: `0x${'cd'.repeat(20)}`,
      adminAddress: `0x${'e5'.repeat(20)}`,
      votingStart: 1,
      votingEnd: 2,
      weightedBudget: 100
    })
  });

  for (let i = 0; i < CREATED_AT.length; i++) {
    await db.queryAsync('INSERT INTO votes SET ?', {
      // VARCHAR(66) — a full proposal id plus a suffix does not fit.
      id: `0xord${String(i).padStart(4, '0')}`,
      ipfs: `bafkreivote${i}`,
      // Descending voter addresses against ascending ids, so voter order and id
      // order disagree and a fixture cannot pass by accident of either.
      voter: `0x${(90 - i).toString(16).padStart(2, '0').repeat(20)}`,
      created: CREATED_AT[i],
      space: 'test.eth',
      proposal: ID,
      choice: envelope(i),
      metadata: '{}',
      reason: '',
      app: '',
      vp: i + 1,
      vp_by_strategy: '[1]',
      vp_state: 'final',
      vp_value: 0,
      cb: 0
    });
  }
}

async function json(path: string): Promise<any> {
  const r = await fetch(`${HOST}/api/proposal/${ID}/${path}`);
  if (!r.ok) throw new Error(`${path} -> ${r.status}: ${await r.text()}`);
  return r.json();
}

describe('/te_ballots and /te_geg_ballots agree on order', () => {
  beforeAll(seed);

  afterAll(async () => {
    await db.queryAsync('DELETE FROM votes WHERE proposal = ?', [ID]);
    await db.queryAsync('DELETE FROM proposals WHERE id = ?', [ID]);
    await db.endAsync();
  });

  it('has a tied timestamp, so the fixture is not vacuous', () => {
    expect(
      CREATED_AT.filter((t, i) => CREATED_AT.indexOf(t) !== i).length
    ).toBeGreaterThan(0);
  });

  it('returns the same ballots in the same positions', async () => {
    const audit = await json('te_ballots');
    const committee = await json('te_geg_ballots');

    expect(audit.ballots).toHaveLength(CREATED_AT.length);
    expect(committee.ballots).toHaveLength(CREATED_AT.length);
    // The committee's sequence number is a position in its list; the panel's is
    // an array index. Equal positions must be the same voter's ballot.
    expect(committee.ballots.map((b: any) => b.sequenceNumber)).toEqual(
      audit.ballots.map((_: unknown, i: number) => i)
    );
    // The committee feed omits `voter` deliberately — it must not learn who
    // cast which ballot. So the positional identity is carried by the envelope
    // itself, which both endpoints expose, and by the weight beside it.
    expect(
      committee.ballots.map((b: any) => b.ballot.ciphertexts[0].c1)
    ).toEqual(audit.ballots.map((b: any) => b.choice.ciphertexts[0].c1));
    expect(
      committee.ballots.map((b: any) => b.ballot.attestation.weight)
    ).toEqual(audit.ballots.map((b: any) => b.vp));
  });

  /**
   * The tiebreak, asserted against the query text — for the same reason the
   * `te_geg_ballots` suite does it that way. With `id ASC` removed, MySQL still
   * happens to return these rows in id order, so the comparison above passes
   * with the property broken. A test that cannot fail on the bug is worse than
   * none, so the check kept is the one that does.
   */
  it('orders by (created, id) in the query itself', () => {
    const source = readFileSync(join(__dirname, '../../src/te.ts'), 'utf8');
    const route = source.slice(source.indexOf("te_ballots', async"));
    const orderings = route.match(/ORDER BY created ASC[^`']*/g) ?? [];
    expect(orderings.length).toBeGreaterThan(0);
    for (const o of orderings) {
      expect(o).toMatch(/ORDER BY created ASC, id ASC/);
    }
  });

  it('applies the same soft-delete filter as the committee feed', async () => {
    await db.queryAsync('UPDATE votes SET cb = -3 WHERE id = ?', ['0xord0002']);
    try {
      const audit = await json('te_ballots');
      const committee = await json('te_geg_ballots');
      expect(audit.ballots).toHaveLength(CREATED_AT.length - 1);
      expect(committee.ballots).toHaveLength(CREATED_AT.length - 1);
      // And both renumber contiguously around the hole, still in step.
      expect(
        committee.ballots.map((b: any) => b.ballot.ciphertexts[0].c1)
      ).toEqual(audit.ballots.map((b: any) => b.choice.ciphertexts[0].c1));
      expect(committee.ballots.map((b: any) => b.sequenceNumber)).toEqual([
        0, 1, 2, 3
      ]);
    } finally {
      await db.queryAsync('UPDATE votes SET cb = 0 WHERE id = ?', [
        '0xord0002'
      ]);
    }
  });
});
