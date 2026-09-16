/**
 * The stall lifecycle, and the split that makes it mean something.
 *
 * A stalled tally is one the committee could not complete — a quorum that never
 * formed, or an election too large to recover inside the coordinator's attempt
 * budget. The flag exists so that state is *persisted* rather than living in the
 * coordinator's memory, and the two directions are deliberately signed by
 * different identities:
 *
 *   - the coordinator marks the stall, because it is the only party that knows
 *     it has run out of attempts;
 *   - the admin clears it.
 *
 * Collapsing that into one authority would make a restart clear the stall by
 * accident: the retry budget is in-memory, so a fresh coordinator sees the
 * election, tries again, and stalls again — looping quietly instead of waiting
 * for a human. These tests pin the split from both sides, including the case
 * that matters most: the coordinator's own signature must not resume.
 */

import { Wallet } from '@ethersproject/wallet';
import fetch from 'node-fetch';
import { eligibilityPublicKey } from '../../src/helpers/eligibilityKey';
import {
  requestDigest,
  requestNoncePayload
} from '../../src/helpers/gegDigests';
import db from '../../src/helpers/mysql';
import { seedEligibilityKey } from '../fixtures/eligibilityKey';

const HOST = `http://localhost:${process.env.PORT || 3030}`;

const PUBLISHER = new Wallet(`0x${'a1'.repeat(32)}`);
const ADMIN = new Wallet(`0x${'b2'.repeat(32)}`);
const KEYPER = new Wallet(`0x${'c3'.repeat(32)}`);
// Distinct from ADMIN on purpose: the author is only the *fallback* authority, so a
// fixture where they are the same address cannot tell the two rules apart.
const AUTHOR = new Wallet(`0x${'e5'.repeat(32)}`);

// Distinct from every other e2e suite's proposal id. `geg-ballots-materialization`
// used to share `0xbbbb...0001` with this file, so each suite's setup and teardown
// deleted the other's row — whichever ran second pulled the ground out from under
// the first, and which tests failed depended on jest's ordering.
const ID = '0xbbbc000000000000000000000000000000000000000000000000000000000001';

/**
 * A stall/resume signature carries the moment it was made, and the hub spends
 * each timestamp once inside a short window — without it, one captured signature
 * would re-stall a tally after every admin retry, forever.
 *
 * Each call takes a fresh `issuedAt`, so tests never collide on a spent nonce.
 * `nextIssuedAt` steps forward rather than reusing `Date.now()`, because two
 * signatures made in the same second are byte-identical under RFC 6979 and the
 * second would be refused as a replay.
 */
let issuedAtCursor = Math.floor(Date.now() / 1000);
function nextIssuedAt(): number {
  return issuedAtCursor++;
}

async function sign(wallet: Wallet, op: string, issuedAt: number) {
  return wallet.signMessage(
    requestDigest(op, ID, requestNoncePayload(issuedAt))
  );
}

/** One timestamp, used both in the signed digest and in the body beside it. */
async function postSigned(
  stalled: boolean,
  key: 'resultPublisherSig' | 'adminSig',
  wallet: Wallet,
  op: string
) {
  const issuedAt = nextIssuedAt();
  return post({
    stalled,
    [key]: await sign(wallet, op, issuedAt),
    issuedAt
  });
}

async function post(body: unknown) {
  const res = await fetch(`${HOST}/api/proposal/${ID}/te_tally_stalled`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.status;
}

async function stalledFlag(): Promise<number> {
  const [row] = await db.queryAsync(
    'SELECT te_tally_stalled FROM proposals WHERE id = ?',
    [ID]
  );
  return Number(row.te_tally_stalled);
}

async function reportedByElectionRead(): Promise<boolean> {
  const res = await fetch(`${HOST}/api/proposal/${ID}/te_geg_election`);
  return (await res.json()).tallyStalled;
}

/**
 * This suite owns its space outright rather than borrowing `test.eth`.
 *
 * It has to create, mutate and delete the space row — the resume authority is read
 * live from `settings.admins`, and two tests rewrite that list. `test.eth` is a
 * name five other e2e suites put proposals under, so deleting it in `afterAll`
 * (and again in `beforeAll`) tore down a fixture the neighbours were using and made
 * them pass or fail on jest's suite order.
 */
const SPACE = 'stall-fixture.eth';

/**
 * Create or restore the fixture space, with `admins` set to `addresses`.
 *
 * Called from `beforeEach`, not just once, for two reasons. Several tests below
 * rewrite `settings.admins` to prove the authority is read live, and re-asserting
 * it here means none of them can leak a mutated list into the next test. And
 * upstream's `space.test.ts` runs `DELETE from spaces` **unqualified** in its own
 * setup and teardown, so any fixture seeded once and left alone can be wiped out
 * from under this suite — after which `resumeAuthorities` falls back to the
 * proposal author and every resume assertion fails with a puzzling 403.
 */
async function upsertSpace(addresses: string[]): Promise<void> {
  await db.queryAsync(
    `INSERT INTO spaces SET ? ON DUPLICATE KEY UPDATE settings = VALUES(settings)`,
    {
      id: SPACE,
      name: 'Stall fixture space',
      settings: JSON.stringify({ admins: addresses }),
      verified: 0,
      deleted: 0,
      flagged: 0,
      hibernated: 0,
      turbo_expiration: 0,
      proposal_count: 0,
      vote_count: 0,
      follower_count: 0,
      created: 1,
      updated: 1
    }
  );
}

describe('POST /api/proposal/:id/te_tally_stalled', () => {
  beforeAll(async () => {
    await upsertSpace([ADMIN.address]);
    // Clear this proposal's spent-nonce ledger.
    //
    // `issuedAtCursor` starts from the wall clock, so two runs against the same
    // database seconds apart reuse timestamps the earlier run already spent, and
    // the replay guard refuses them. The suite passes today only because
    // `test:setup` happens to drop the database first; owning the ledger makes it
    // re-runnable on its own, which is what let this go unnoticed.
    await db.queryAsync('DELETE FROM te_request_nonces WHERE proposal_id = ?', [
      ID
    ]);
    // The frozen key has to be the one in use: the election read asserts they
    // match and 503s otherwise, which would look like a stall bug. The hub no
    // longer holds the key — it reads the published public half — so this suite
    // publishes it first. Seeding here rather than inheriting it from whichever
    // suite happens to run earlier is the point: without it these tests pass or
    // fail on jest's ordering.
    await seedEligibilityKey();
    const eligibilityKey = await eligibilityPublicKey();
    await db.queryAsync('DELETE FROM proposals WHERE id = ?', [ID]);
    await db.queryAsync('INSERT INTO proposals SET ?', {
      id: ID,
      ipfs: 'bafkreistallfixture',
      author: AUTHOR.address,
      created: 1,
      space: SPACE,
      network: '1',
      symbol: '',
      type: 'weighted',
      strategies: '[]',
      validation: '{}',
      plugins: '{}',
      title: 'stall lifecycle',
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
      te_geg_config: JSON.stringify({
        v: 1,
        keypers: [{ address: KEYPER.address, url: 'https://k1.example' }],
        thresholdT: 1,
        thresholdN: 1,
        eligibilityKey,
        resultPublisherAddress: PUBLISHER.address,
        adminAddress: ADMIN.address,
        votingStart: 1,
        votingEnd: 2,
        weightedBudget: 100
      })
    });
  });

  afterAll(async () => {
    await db.queryAsync('DELETE FROM spaces WHERE id = ?', [SPACE]);
    await db.queryAsync('DELETE FROM proposals WHERE id = ?', [ID]);
    await db.endAsync();
  });

  beforeEach(async () => {
    // Re-assert the space every test: neighbouring suites truncate `spaces`, and
    // tests in this file deliberately mutate its admin list.
    await upsertSpace([ADMIN.address]);
    await db.queryAsync(
      'UPDATE proposals SET te_tally_stalled = 0 WHERE id = ?',
      [ID]
    );
  });

  it('lets the coordinator mark a stall', async () => {
    expect(
      await postSigned(true, 'resultPublisherSig', PUBLISHER, 'tally_stall')
    ).toBe(204);
    expect(await stalledFlag()).toBe(1);
    expect(await reportedByElectionRead()).toBe(true);
  });

  it('lets the admin clear one', async () => {
    await postSigned(true, 'resultPublisherSig', PUBLISHER, 'tally_stall');
    expect(await postSigned(false, 'adminSig', ADMIN, 'tally_resume')).toBe(
      204
    );
    expect(await stalledFlag()).toBe(0);
    expect(await reportedByElectionRead()).toBe(false);
  });

  // The property the whole split exists for. A coordinator restart re-signs
  // whatever it can; if that included a resume, a stalled election would clear
  // itself and loop.
  it('refuses a resume signed by the coordinator', async () => {
    await postSigned(true, 'resultPublisherSig', PUBLISHER, 'tally_stall');
    expect(await postSigned(false, 'adminSig', PUBLISHER, 'tally_resume')).toBe(
      403
    );
    expect(await stalledFlag()).toBe(1); // still stalled
  });

  it('refuses a stall signed by the admin', async () => {
    expect(
      await postSigned(true, 'resultPublisherSig', ADMIN, 'tally_stall')
    ).toBe(403);
    expect(await stalledFlag()).toBe(0);
  });

  it('refuses either direction from a committee member', async () => {
    expect(
      await postSigned(true, 'resultPublisherSig', KEYPER, 'tally_stall')
    ).toBe(403);
    expect(await postSigned(false, 'adminSig', KEYPER, 'tally_resume')).toBe(
      403
    );
  });

  // The direction is inside the signed message, so a signature taken for one
  // direction cannot be presented as the other.
  it('refuses a stall signature replayed as a resume', async () => {
    await postSigned(true, 'resultPublisherSig', PUBLISHER, 'tally_stall');
    expect(await postSigned(false, 'adminSig', ADMIN, 'tally_stall')).toBe(403);
    expect(await stalledFlag()).toBe(1);
  });

  // The authority is live, so adding an admin grants it immediately — this is the
  // case a frozen list gets wrong: an admin appointed after the proposal was made
  // could not revive it.
  it('lets an admin added after the proposal was created clear it', async () => {
    const LATE = new Wallet(`0x${'d4'.repeat(32)}`);
    await db.queryAsync('UPDATE spaces SET settings = ? WHERE id = ?', [
      JSON.stringify({ admins: [ADMIN.address, LATE.address] }),
      SPACE
    ]);
    await postSigned(true, 'resultPublisherSig', PUBLISHER, 'tally_stall');
    expect(await postSigned(false, 'adminSig', LATE, 'tally_resume')).toBe(204);
    await db.queryAsync('UPDATE spaces SET settings = ? WHERE id = ?', [
      JSON.stringify({ admins: [ADMIN.address] }),
      SPACE
    ]);
  });

  // And removing one revokes it, which a frozen list also gets wrong.
  it('refuses an admin who has since been removed from the space', async () => {
    await db.queryAsync('UPDATE spaces SET settings = ? WHERE id = ?', [
      JSON.stringify({ admins: [] }),
      SPACE
    ]);
    await postSigned(true, 'resultPublisherSig', PUBLISHER, 'tally_stall');
    // The author is the fallback, and ADMIN is not the author.
    expect(await postSigned(false, 'adminSig', ADMIN, 'tally_resume')).toBe(
      403
    );
    expect(await stalledFlag()).toBe(1);
    await db.queryAsync('UPDATE spaces SET settings = ? WHERE id = ?', [
      JSON.stringify({ admins: [ADMIN.address] }),
      SPACE
    ]);
  });

  // A space with no admins must not leave a stall unrecoverable.
  it('falls back to the proposal author when the space lists no admins', async () => {
    await db.queryAsync('UPDATE spaces SET settings = ? WHERE id = ?', [
      JSON.stringify({ admins: [] }),
      SPACE
    ]);
    await postSigned(true, 'resultPublisherSig', PUBLISHER, 'tally_stall');
    expect(await postSigned(false, 'adminSig', AUTHOR, 'tally_resume')).toBe(
      204
    );
    await db.queryAsync('UPDATE spaces SET settings = ? WHERE id = ?', [
      JSON.stringify({ admins: [ADMIN.address] }),
      SPACE
    ]);
  });

  it('rejects a missing or non-boolean direction', async () => {
    const issuedAt = nextIssuedAt();
    const sig = await sign(PUBLISHER, 'tally_stall', issuedAt);
    expect(await post({ resultPublisherSig: sig, issuedAt })).toBe(400);
    expect(
      await post({ stalled: 'yes', resultPublisherSig: sig, issuedAt })
    ).toBe(400);
  });

  // The freshness half of the replay defence: a signature made outside the
  // window is refused even though it is perfectly valid, because the replay that
  // matters is the one presented long after it was issued.
  it('rejects a signature issued outside the acceptance window', async () => {
    const stale = Math.floor(Date.now() / 1000) - 3600;
    expect(
      await post({
        stalled: true,
        resultPublisherSig: await sign(PUBLISHER, 'tally_stall', stale),
        issuedAt: stale
      })
    ).toBe(400);
  });

  it('rejects a body with no issuedAt at all', async () => {
    expect(
      await post({
        stalled: true,
        resultPublisherSig: await sign(PUBLISHER, 'tally_stall', nextIssuedAt())
      })
    ).toBe(400);
  });
});
