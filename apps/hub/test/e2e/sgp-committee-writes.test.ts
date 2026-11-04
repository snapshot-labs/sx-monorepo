/**
 * Tests for the committee's writes: the DKG result, the aggregate, the
 * decryption shares and the published tally.
 *
 * Each accepts only its authorised signers. The DKG result and the aggregate
 * become canonical once a quorum submits the same one, and a later, different
 * submission never replaces a stored one.
 */

import { Wallet } from '@ethersproject/wallet';
import {
  G2Point,
  initCurves,
  partialDecrypt,
  Transcript
} from '@shutter-network/urban-verified-crypto';
import fetch from 'node-fetch';
import { stringifyPreservingBigInts } from '../../src/helpers/bigIntJson';
import db from '../../src/helpers/mysql';
import {
  aggregateDigest,
  decryptionShareDigest,
  dkgResultDigest,
  requestDigest,
  resultDigest
} from '../../src/helpers/sgpDigests';
import {
  cleanup,
  committee,
  HOST,
  insertProposal,
  KEYPERS,
  postJson
} from '../fixtures/sgp';

const DKG_ID = `0xcc0d${'00'.repeat(29)}01`;
const RESULT_ID = `0xcc0d${'00'.repeat(29)}02`;
const HEX_RESULT_ID = `0xcc0d${'00'.repeat(29)}03`;
const CLOSED =
  '0xaaaa000000000000000000000000000000000000000000000000000000000001';
const OPEN =
  '0xaaaa000000000000000000000000000000000000000000000000000000000002';
const SHARES_ID =
  '0xaaaa0000000000000000000000000000000000000000000000000000000000d5';
const IDS = [DKG_ID, RESULT_ID, HEX_RESULT_ID, CLOSED, OPEN, SHARES_ID];

const PUBLISHER = new Wallet(`0x${'55'.repeat(32)}`);
const OUTSIDER = new Wallet(`0x${'66'.repeat(32)}`);

const point = (byte: string) => `0x${byte.repeat(96)}`;
const MPK = point('ab');
const COMMITTEE = [point('a1'), point('a2'), point('a3')];

const FUTURE = Math.floor(Date.now() / 1000) + 3600;

beforeAll(async () => {
  const config = JSON.stringify(
    committee({ resultPublisherAddress: PUBLISHER.address })
  );
  // The key ceremony runs before voting starts.
  await insertProposal(DKG_ID, {
    start: FUTURE,
    end: FUTURE + 600,
    te_sgp_config: config
  });
  for (const id of [RESULT_ID, HEX_RESULT_ID, CLOSED]) {
    await insertProposal(id, { te_sgp_config: config });
  }
  await insertProposal(OPEN, { end: FUTURE, te_sgp_config: config });
});

afterAll(async () => {
  for (const id of IDS) await cleanup(id);
  await db.endAsync();
});

describe('POST /api/proposal/:id/te_sgp_dkg', () => {
  async function submitDkg(
    wallet: Wallet,
    pkElection = MPK,
    committeePKs = COMMITTEE
  ) {
    const dkg = { pkElection, committeePKs };
    const keyperSig = await wallet.signMessage(
      dkgResultDigest({ electionId: DKG_ID, ...dkg })
    );
    return postJson(DKG_ID, 'te_sgp_dkg', { ...dkg, keyperSig });
  }

  async function electionKey(): Promise<string | null> {
    const [row] = await db.queryAsync(
      'SELECT HEX(te_mpk) AS mpk FROM proposals WHERE id = ?',
      [DKG_ID]
    );
    return row.mpk ? `0x${row.mpk.toLowerCase()}` : null;
  }

  // No key by the start means the ceremony failed: the coordinator will not tally
  // the proposal, so a late result must not open voting.
  it('refuses a result once voting has started without a key', async () => {
    const dkg = { pkElection: MPK, committeePKs: COMMITTEE };
    const keyperSig = await KEYPERS[0].signMessage(
      dkgResultDigest({ electionId: CLOSED, ...dkg })
    );
    expect(await postJson(CLOSED, 'te_sgp_dkg', { ...dkg, keyperSig })).toBe(
      422
    );
  });

  it('refuses an outsider and a committee of the wrong size', async () => {
    expect(await submitDkg(OUTSIDER)).toBe(403);
    expect(await submitDkg(KEYPERS[0], MPK, COMMITTEE.slice(0, 2))).toBe(400);
  });

  it('sets the election key only once a quorum submits the same one', async () => {
    expect(await submitDkg(KEYPERS[0])).toBe(204);
    expect(await electionKey()).toBeNull();

    expect(await submitDkg(KEYPERS[1])).toBe(204);
    expect(await electionKey()).toBe(MPK);
  });

  it('accepts two simultaneous identical submissions from one keyper', async () => {
    expect(
      await Promise.all([submitDkg(KEYPERS[2]), submitDkg(KEYPERS[2])])
    ).toEqual([204, 204]);
  });

  it('accepts an identical resend and refuses a changed one', async () => {
    expect(await submitDkg(KEYPERS[0])).toBe(204);
    expect(await submitDkg(KEYPERS[0], point('cd'))).toBe(409);
    expect(await electionKey()).toBe(MPK);
  });
});

/**
 * Each keyper computes the aggregate on its own, and it becomes canonical only
 * when a quorum submits byte-identical copies. The rules follow the protocol's
 * reference store:
 *
 *   - a submission before voting closes is a 422, not a 400 (the client retries a
 *     422 and gives up on a 400);
 *   - a keyper may replace its own submission until a quorum forms, so the
 *     committee can redo it after a disagreement;
 *   - once an aggregate has a quorum, a different submission is a 409.
 */
describe('POST /api/proposal/:id/te_aggregate', () => {
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
    aggregate: Omit<Parameters<typeof aggregateDigest>[0], 'electionId'>
  ) {
    const keyperSig = await wallet.signMessage(
      aggregateDigest({ ...aggregate, electionId: proposalId })
    );
    // Like the keyper's JSON encoder: integers written as exact digits.
    return postJson(
      proposalId,
      'te_aggregate',
      stringifyPreservingBigInts({ aggregate, keyperSig })
    );
  }

  async function canonical(proposalId: string) {
    const res = await fetch(
      `${HOST}/api/proposal/${proposalId}/te_sgp_aggregate`
    );
    return (await res.json()).aggregate;
  }

  async function submissionCount(): Promise<number> {
    const [{ c }] = await db.queryAsync(
      'SELECT COUNT(*) AS c FROM te_aggregate_submissions WHERE proposal_id = ?',
      [CLOSED]
    );
    return Number(c);
  }

  beforeEach(async () => {
    await db.queryAsync(
      'DELETE FROM te_aggregate_submissions WHERE proposal_id = ?',
      [CLOSED]
    );
  });

  it('refuses an open ballot set and a submission from outside the committee', async () => {
    expect(await submit(OPEN, KEYPERS[0], artifact(OPEN))).toBe(422);
    expect(await canonical(OPEN)).toBeNull();
    expect(await submit(CLOSED, OUTSIDER, artifact(CLOSED))).toBe(403);
    expect(await canonical(CLOSED)).toBeNull();
  });

  it('promotes the artifact once a quorum submits it byte-identically', async () => {
    // The first submission is recorded without becoming canonical.
    expect(await submit(CLOSED, KEYPERS[0], artifact(CLOSED))).toBe(204);
    expect(await canonical(CLOSED)).toBeNull();

    expect(await submit(CLOSED, KEYPERS[1], artifact(CLOSED))).toBe(204);

    expect(await canonical(CLOSED)).toMatchObject({
      admitted: [0, 1],
      exclusions: [],
      totalAdmittedWeight: 2,
      totalScaledWeight: 2
    });
  });

  // A different aggregate is recorded, so the disagreement is visible, but it
  // does not count toward the other aggregate's quorum.
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

    // When a second keyper agrees with one of them, that one becomes canonical.
    expect(await submit(CLOSED, KEYPERS[2], artifact(CLOSED))).toBe(204);
    expect(await canonical(CLOSED)).not.toBeNull();
  });

  // The coordinator asks keypers to resubmit when their submissions disagree.
  it('lets a keyper replace its own aggregate while no quorum exists', async () => {
    expect(await submit(CLOSED, KEYPERS[0], artifact(CLOSED, 1))).toBe(204);
    // An identical resend is a no-op.
    expect(await submit(CLOSED, KEYPERS[0], artifact(CLOSED, 1))).toBe(204);
    expect(await submissionCount()).toBe(1);

    expect(await submit(CLOSED, KEYPERS[0], artifact(CLOSED))).toBe(204);
    expect(await submissionCount()).toBe(1); // replaced, not appended

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

  // Total voting power can exceed 2^53. 2^54 + 1 is not exact as a double, so
  // this passes only if nothing rounds it on the way in or out.
  it('accepts and serves back a total admitted weight past 2^53 exactly', async () => {
    const weight = 2n ** 54n + 1n;
    const big = { ...artifact(CLOSED), totalAdmittedWeight: weight };
    expect(await submit(CLOSED, KEYPERS[0], big)).toBe(204);
    expect(await submit(CLOSED, KEYPERS[1], big)).toBe(204);

    const res = await fetch(`${HOST}/api/proposal/${CLOSED}/te_sgp_aggregate`);
    expect(await res.text()).toContain(`"totalAdmittedWeight":${weight}`);
  });
});

/**
 * A keyper's decryption shares (one row per candidate) are checked against the
 * canonical aggregate and stored all at once or not at all. A partial write
 * would make the keyper's identical resend look like different shares and get a
 * 409, removing that keyper from the tally.
 */
describe('POST /api/proposal/:id/te_sgp_decryption_share', () => {
  const MSKS = [0x1111n, 0x2222n, 0x3333n];
  const CANDIDATES = 3;

  const hex = (bytes: Uint8Array) => `0x${Buffer.from(bytes).toString('hex')}`;
  const scalar = (n: bigint) => n.toString(16).padStart(64, '0');

  let entries: { sigma: string; proof: string }[];

  function transcript(candidate: number): Transcript {
    const t = new Transcript('SHUTTER-VOTE-DECRYPT-v1');
    t.append('electionId', Buffer.from(SHARES_ID.slice(2), 'hex'));
    const c = Buffer.alloc(2);
    c.writeUInt16BE(candidate, 0);
    t.append('candidate', c);
    return t;
  }

  /** Keyper 1's shares, signed as a whole. */
  async function post(shareEntries = entries) {
    const digest = decryptionShareDigest({
      electionId: SHARES_ID,
      entries: shareEntries
    });
    return fetch(`${HOST}/api/proposal/${SHARES_ID}/te_sgp_decryption_share`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        share: { keyperIndex: 1, entries: shareEntries },
        keyperSig: await KEYPERS[0].signMessage(digest)
      })
    });
  }

  /** Keyper 1's shares with one byte of candidate 0's proof flipped. */
  function tampered() {
    const { proof } = entries[0];
    const last = (parseInt(proof.slice(-2), 16) ^ 1).toString(16);
    return [
      { ...entries[0], proof: proof.slice(0, -2) + last.padStart(2, '0') },
      ...entries.slice(1)
    ];
  }

  async function storedCandidates(): Promise<number[]> {
    const rows = await db.queryAsync(
      'SELECT candidate FROM te_decryption_shares WHERE proposal_id = ? AND keyper_index = 1 ORDER BY candidate',
      [SHARES_ID]
    );
    return rows.map((r: any) => r.candidate);
  }

  beforeAll(async () => {
    await initCurves();

    const g = G2Point.generator();
    const pks = MSKS.map(msk => g.mul(msk));
    // Any on-curve points will do: the DLEQ check is algebraic and does not need
    // the ciphertext to decrypt to anything.
    const aggregates = Array.from({ length: CANDIDATES }, () => ({
      c1: hex(g.toBytes()),
      c2: hex(g.toBytes())
    }));

    await insertProposal(SHARES_ID, {
      type: 'basic',
      choices: JSON.stringify(['For', 'Against', 'Abstain']),
      te_config: JSON.stringify({
        numCandidates: CANDIDATES,
        budget: 1,
        mode: 'exact',
        variant: 'A'
      }),
      te_committee_pks: JSON.stringify(pks.map(pk => hex(pk.toBytes())))
    });

    // A canonical aggregate: two keypers agreeing on one digest.
    for (const index of [1, 2]) {
      await db.queryAsync('INSERT INTO te_aggregate_submissions SET ?', {
        proposal_id: SHARES_ID,
        keyper_index: index,
        keyper_address: KEYPERS[index - 1].address,
        aggregate_json: JSON.stringify({ electionId: SHARES_ID, aggregates }),
        digest: `0x${'cd'.repeat(32)}`,
        signature: '0x',
        posted_at: 1
      });
    }

    // Keyper 1's real shares and proofs over those ciphertexts.
    entries = aggregates.map((_ct, candidate) => {
      const share = partialDecrypt(
        { c1: g, c2: g },
        MSKS[0],
        pks[0],
        1,
        transcript(candidate)
      );
      const entry = {
        sigma: hex(share.sigma.toBytes()),
        proof: `0x${scalar(share.proof.e)}${scalar(share.proof.z)}`
      };
      share.sigma.destroyWasm();
      return entry;
    });
    pks.forEach(pk => pk.destroyWasm());
    g.destroyWasm();
  });

  afterAll(async () => {
    await db.queryAsync('DROP TRIGGER IF EXISTS fail_share_candidate_2');
  });

  // Runs first: once shares are stored, a different set is a 409 before any
  // proof is checked.
  it('refuses a validly signed share whose proof does not verify', async () => {
    const res = await post(tampered());
    expect(res.status).toBe(400);
    expect((await res.json()).error_description).toBe('invalid_dleq_proof');
    expect(await storedCandidates()).toEqual([]);
  });

  it('stores nothing when the write fails part way, so the resend succeeds', async () => {
    await db.queryAsync(
      `CREATE TRIGGER fail_share_candidate_2 BEFORE INSERT ON te_decryption_shares
       FOR EACH ROW BEGIN
         IF NEW.candidate = 2 THEN
           SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'injected failure';
         END IF;
       END`
    );
    expect((await post()).status).toBe(500);
    expect(await storedCandidates()).toEqual([]);

    await db.queryAsync('DROP TRIGGER fail_share_candidate_2');
    expect((await post()).status).toBe(204);
    expect(await storedCandidates()).toEqual([0, 1, 2]);

    // A further identical resend is a no-op.
    expect((await post()).status).toBe(204);
  });

  it('refuses different shares from a keyper that already stored its own', async () => {
    expect((await post(tampered())).status).toBe(409);
    expect(await storedCandidates()).toEqual([0, 1, 2]);
  });
});

describe('POST /api/proposal/:id/te_result', () => {
  // Above 2^53, so a total rounded through a double would fail the signature.
  const TOTALS = [2n ** 54n + 1n, 0n, 7n];

  /** Posts a result as raw text, so totals past 2^53 reach the hub exactly. */
  async function postResult(wallet: Wallet, totals: bigint[]) {
    const result = { totals, keyperIndices: [1, 2], bsgsBound: 1000n };
    const sig = await wallet.signMessage(
      requestDigest(
        'result',
        RESULT_ID,
        resultDigest({ electionId: RESULT_ID, ...result })
      )
    );
    return postJson(
      RESULT_ID,
      'te_result',
      `{"result":{"electionId":"${RESULT_ID}","totals":[${totals.join(',')}],` +
        `"keyperIndices":[1,2],"bsgsBound":1000},"resultPublisherSig":"${sig}"}`
    );
  }

  it('publishes only the signed totals, once, exactly as signed', async () => {
    expect(await postResult(OUTSIDER, TOTALS)).toBe(403);

    expect(await postResult(PUBLISHER, TOTALS)).toBe(204);
    const res = await fetch(`${HOST}/api/proposal/${RESULT_ID}/te_result`);
    expect(await res.text()).toContain(`"totals":[${TOTALS.join(',')}]`);

    // An identical resend is accepted; a different result is refused.
    expect(await postResult(PUBLISHER, TOTALS)).toBe(204);
    expect(await postResult(PUBLISHER, [1n, 2n, 3n])).toBe(409);
  });

  // The digest reads "0x05" as 5, so it must be stored as 5: a bare `0x05` in
  // the served JSON would be unreadable, and results cannot be rewritten.
  it('stores a total signed in hex as decimal digits', async () => {
    const result = {
      totals: ['0x05', '0'],
      keyperIndices: [1, 2],
      bsgsBound: 10
    };
    const sig = await PUBLISHER.signMessage(
      requestDigest(
        'result',
        HEX_RESULT_ID,
        resultDigest({ electionId: HEX_RESULT_ID, ...result })
      )
    );
    expect(
      await postJson(HEX_RESULT_ID, 'te_result', {
        result,
        resultPublisherSig: sig
      })
    ).toBe(204);
    const res = await fetch(`${HOST}/api/proposal/${HEX_RESULT_ID}/te_result`);
    expect((await res.json()).result.totals).toEqual([5, 0]);
  });
});
