/**
 * A keyper's decryption shares are stored completely or not at all.
 *
 * The envelope carries one share per candidate and is stored as one row each.
 * Written row by row, a failure part way left some candidates stored, and the
 * retry check then read the keyper's identical resend as different shares and
 * answered 409 for good — one keyper out of the tally per failure, and with
 * 2-of-3 two of them leave the election undecryptable.
 *
 * The failure is injected with a trigger that refuses one candidate's row, so the
 * write fails exactly where a dropped connection would leave it.
 */

import { Wallet } from '@ethersproject/wallet';
import {
  G2Point,
  initCurves,
  partialDecrypt,
  Transcript
} from '@shutter-network/urban-verified-crypto';
import fetch from 'node-fetch';
import db from '../../src/helpers/mysql';
import { decryptionShareDigest } from '../../src/helpers/sgpDigests';

const HOST = `http://localhost:${process.env.PORT || 3030}`;
const ID = '0xaaaa0000000000000000000000000000000000000000000000000000000000d5';

const KEYPERS = [
  new Wallet(`0x${'11'.repeat(32)}`),
  new Wallet(`0x${'22'.repeat(32)}`),
  new Wallet(`0x${'33'.repeat(32)}`)
];
const MSKS = [0x1111n, 0x2222n, 0x3333n];
const CANDIDATES = 3;

const hex = (bytes: Uint8Array) => `0x${Buffer.from(bytes).toString('hex')}`;
const scalar = (n: bigint) => n.toString(16).padStart(64, '0');

function transcript(candidate: number): Transcript {
  const t = new Transcript('SHUTTER-VOTE-DECRYPT-v1');
  t.append('electionId', Buffer.from(ID.slice(2), 'hex'));
  const c = Buffer.alloc(2);
  c.writeUInt16BE(candidate, 0);
  t.append('candidate', c);
  return t;
}

let envelope: { share: any; keyperSig: string };

async function post() {
  const res = await fetch(
    `${HOST}/api/proposal/${ID}/te_sgp_decryption_share`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(envelope)
    }
  );
  return res.status;
}

async function storedCandidates(): Promise<number[]> {
  const rows = await db.queryAsync(
    'SELECT candidate FROM te_decryption_shares WHERE proposal_id = ? AND keyper_index = 1 ORDER BY candidate',
    [ID]
  );
  return rows.map((r: any) => r.candidate);
}

async function cleanup() {
  await db.queryAsync('DROP TRIGGER IF EXISTS fail_share_candidate_2');
  for (const table of ['te_decryption_shares', 'te_aggregate_submissions']) {
    await db.queryAsync(`DELETE FROM ${table} WHERE proposal_id = ?`, [ID]);
  }
  await db.queryAsync('DELETE FROM proposals WHERE id = ?', [ID]);
}

beforeAll(async () => {
  await initCurves();
  await cleanup();

  const g = G2Point.generator();
  const pks = MSKS.map(msk => g.mul(msk));
  // Any on-curve points will do: the DLEQ check is algebraic and does not need
  // the ciphertext to decrypt to anything.
  const aggregates = Array.from({ length: CANDIDATES }, () => ({
    c1: hex(g.toBytes()),
    c2: hex(g.toBytes())
  }));

  await db.queryAsync('INSERT INTO proposals SET ?', {
    id: ID,
    ipfs: 'bafkreisharesatomicfixture',
    author: KEYPERS[0].address,
    created: 1,
    space: 'test.eth',
    network: '1',
    symbol: '',
    type: 'basic',
    strategies: '[]',
    validation: '{}',
    plugins: '{}',
    title: 'atomic shares',
    body: '',
    discussion: '',
    choices: JSON.stringify(['For', 'Against', 'Abstain']),
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
    te_config: JSON.stringify({
      numCandidates: CANDIDATES,
      budget: 1,
      mode: 'exact',
      variant: 'A'
    }),
    te_committee_pks: JSON.stringify(pks.map(pk => hex(pk.toBytes()))),
    te_sgp_config: JSON.stringify({
      v: 1,
      keypers: KEYPERS.map((w, i) => ({
        address: w.address,
        url: `https://k${i + 1}.example`
      })),
      thresholdT: 2,
      thresholdN: 3,
      eligibilityKey: `0x${'ab'.repeat(48)}`,
      resultPublisherAddress: KEYPERS[2].address,
      adminAddress: KEYPERS[2].address,
      votingStart: 1,
      votingEnd: 2,
      weightedBudget: 100
    })
  });

  // A canonical aggregate: two keypers agreeing on one digest.
  for (const index of [1, 2]) {
    await db.queryAsync('INSERT INTO te_aggregate_submissions SET ?', {
      proposal_id: ID,
      keyper_index: index,
      keyper_address: KEYPERS[index - 1].address,
      aggregate_json: JSON.stringify({ electionId: ID, aggregates }),
      digest: `0x${'cd'.repeat(32)}`,
      signature: '0x',
      posted_at: 1
    });
  }

  // Keyper 1's real shares and proofs over those ciphertexts.
  const entries = aggregates.map((_ct, candidate) => {
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

  const digest = decryptionShareDigest({ electionId: ID, entries });
  envelope = {
    share: { keyperIndex: 1, entries },
    keyperSig: await KEYPERS[0].signMessage(digest)
  };
});

afterAll(async () => {
  await cleanup();
  await db.endAsync();
});

describe('POST /api/proposal/:id/te_sgp_decryption_share', () => {
  it('stores nothing when the write fails part way, so the resend succeeds', async () => {
    await db.queryAsync(
      `CREATE TRIGGER fail_share_candidate_2 BEFORE INSERT ON te_decryption_shares
       FOR EACH ROW BEGIN
         IF NEW.candidate = 2 THEN
           SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'injected failure';
         END IF;
       END`
    );
    expect(await post()).toBe(500);
    expect(await storedCandidates()).toEqual([]);

    await db.queryAsync('DROP TRIGGER fail_share_candidate_2');
    expect(await post()).toBe(204);
    expect(await storedCandidates()).toEqual([0, 1, 2]);

    // And the resend after that is the idempotent no-op it always was.
    expect(await post()).toBe(204);
  });
});
