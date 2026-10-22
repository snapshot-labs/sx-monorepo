/**
 * Tests for marking and clearing a stalled tally (one the committee could not
 * finish, e.g. no quorum or too many attempts).
 *
 * Only the coordinator can mark a stall and only an admin can clear it. The
 * coordinator's retry count is in memory, so if it could also clear stalls, a
 * restart would retry and stall again in a loop instead of waiting for a human.
 */

import { Wallet } from '@ethersproject/wallet';
import fetch from 'node-fetch';
import db from '../../src/helpers/mysql';
import {
  requestDigest,
  requestNoncePayload
} from '../../src/helpers/sgpDigests';
import {
  cleanup,
  committee,
  HOST,
  insertProposal,
  postJson
} from '../fixtures/sgp';

const PUBLISHER = new Wallet(`0x${'a1'.repeat(32)}`);
const ADMIN = new Wallet(`0x${'b2'.repeat(32)}`);
const KEYPER = new Wallet(`0x${'c3'.repeat(32)}`);
// Different from ADMIN so the tests can tell the admin rule from the author fallback.
const AUTHOR = new Wallet(`0x${'e5'.repeat(32)}`);

// Must differ from every other e2e suite's proposal id, since each suite deletes
// its own row in setup and teardown.
const ID = '0xbbbc000000000000000000000000000000000000000000000000000000000001';

/**
 * The hub accepts each signed `issuedAt` only once, to block replays. Each call
 * returns a new, increasing timestamp: two signatures made in the same second are
 * identical (RFC 6979), and the second would be refused as a replay.
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

/** Uses the same `issuedAt` in the signed digest and in the body. */
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

function post(body: Record<string, any>) {
  return postJson(ID, 'te_tally_stalled', body);
}

async function stalledFlag(): Promise<number> {
  const [row] = await db.queryAsync(
    'SELECT te_tally_stalled FROM proposals WHERE id = ?',
    [ID]
  );
  return Number(row.te_tally_stalled);
}

async function reportedByElectionRead(): Promise<boolean> {
  const res = await fetch(`${HOST}/api/proposal/${ID}/te_sgp_election`);
  return (await res.json()).tallyStalled;
}

/**
 * A space used only by this suite, because the tests rewrite and delete it.
 * `test.eth` is shared with other e2e suites.
 */
const SPACE = 'stall-fixture.eth';

/**
 * Creates or restores the fixture space with `admins` set to `addresses`.
 *
 * Runs before each test: some tests change `settings.admins`, and `space.test.ts`
 * deletes every row in `spaces`. Without the space, resume falls back to the
 * proposal author and the admin tests fail with 403.
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
    // Cleanup also clears this proposal's spent nonces, so a second run seconds
    // later does not reuse timestamps that are already spent.
    await insertProposal(ID, {
      author: AUTHOR.address,
      space: SPACE,
      te_sgp_config: JSON.stringify(
        committee({
          keypers: [{ address: KEYPER.address, url: 'https://k1.example' }],
          thresholdT: 1,
          thresholdN: 1,
          resultPublisherAddress: PUBLISHER.address,
          adminAddress: ADMIN.address
        })
      )
    });
  });

  afterAll(async () => {
    await db.queryAsync('DELETE FROM spaces WHERE id = ?', [SPACE]);
    await cleanup(ID);
    await db.endAsync();
  });

  beforeEach(async () => {
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

  // Otherwise a restarted coordinator could clear its own stall and loop.
  it('refuses a resume signed by the coordinator', async () => {
    await postSigned(true, 'resultPublisherSig', PUBLISHER, 'tally_stall');
    expect(await postSigned(false, 'adminSig', PUBLISHER, 'tally_resume')).toBe(
      403
    );
    expect(await stalledFlag()).toBe(1); // still stalled
  });

  it('refuses either direction from a committee member', async () => {
    expect(
      await postSigned(true, 'resultPublisherSig', KEYPER, 'tally_stall')
    ).toBe(403);
    expect(await postSigned(false, 'adminSig', KEYPER, 'tally_resume')).toBe(
      403
    );
  });

  // The direction is part of the signed message.
  it('refuses a stall signature replayed as a resume', async () => {
    await postSigned(true, 'resultPublisherSig', PUBLISHER, 'tally_stall');
    expect(await postSigned(false, 'adminSig', ADMIN, 'tally_stall')).toBe(403);
    expect(await stalledFlag()).toBe(1);
  });

  // Admins are read from the space at request time, not frozen at creation.
  it('checks the space admins at request time', async () => {
    const LATE = new Wallet(`0x${'d4'.repeat(32)}`);
    await upsertSpace([ADMIN.address, LATE.address]);
    await postSigned(true, 'resultPublisherSig', PUBLISHER, 'tally_stall');
    expect(await postSigned(false, 'adminSig', LATE, 'tally_resume')).toBe(204);

    // An admin removed since then is refused. The author is the fallback, and
    // ADMIN is not the author.
    await upsertSpace([]);
    await postSigned(true, 'resultPublisherSig', PUBLISHER, 'tally_stall');
    expect(await postSigned(false, 'adminSig', ADMIN, 'tally_resume')).toBe(
      403
    );
    expect(await stalledFlag()).toBe(1);
  });

  // A space with no admins must not leave a stall unrecoverable.
  it('falls back to the proposal author when the space lists no admins', async () => {
    await upsertSpace([]);
    await postSigned(true, 'resultPublisherSig', PUBLISHER, 'tally_stall');
    expect(await postSigned(false, 'adminSig', AUTHOR, 'tally_resume')).toBe(
      204
    );
  });

  // A valid signature is still refused if `issuedAt` is missing or outside the
  // window.
  it('rejects a signature issued outside the acceptance window', async () => {
    const stale = Math.floor(Date.now() / 1000) - 3600;
    expect(
      await post({
        stalled: true,
        resultPublisherSig: await sign(PUBLISHER, 'tally_stall', stale),
        issuedAt: stale
      })
    ).toBe(400);
    expect(
      await post({
        stalled: true,
        resultPublisherSig: await sign(PUBLISHER, 'tally_stall', nextIssuedAt())
      })
    ).toBe(400);
  });

  // A spent nonce must be kept until its `issuedAt` (not its acceptance time)
  // leaves the window; otherwise a signer with a fast clock lets the stall be
  // replayed after the admin's resume.
  it('refuses a replayed stall after a resume, even when the signer clock ran ahead', async () => {
    const issuedAt = Math.floor(Date.now() / 1000) - 50;
    const stall = {
      stalled: true,
      resultPublisherSig: await sign(PUBLISHER, 'tally_stall', issuedAt),
      issuedAt
    };
    expect(await post(stall)).toBe(204);
    // As if accepted 350 s ago, from a coordinator whose clock was 300 s ahead.
    await db.queryAsync(
      `UPDATE te_request_nonces SET accepted_at = ?
        WHERE proposal_id = ? AND op = 'tally_stall' AND issued_at = ?`,
      [Math.floor(Date.now() / 1000) - 350, ID, issuedAt]
    );

    expect(await postSigned(false, 'adminSig', ADMIN, 'tally_resume')).toBe(
      204
    );
    expect(await post(stall)).toBe(409);
    expect(await stalledFlag()).toBe(0);
  });
});
