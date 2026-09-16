/**
 * Deleting a private proposal — the same terms as a public one, plus its artifacts.
 */

import { CB } from '../../../src/constants';
import * as actionHelper from '../../../src/helpers/actions';
import db, { sequencerDB } from '../../../src/helpers/mysql';
import { action, verify } from '../../../src/writer/delete-proposal';
import { spacesGetSpaceFixtures } from '../../fixtures/space';

const AUTHOR = '0xFC01614d28595d9ea5963daD9f44C0E0F0fE10f0';
const STRANGER = '0x0000000000000000000000000000000000000bad';
const SPACE = 'test.eth';
const PAST = 1_600_000_000;
const FUTURE = Math.floor(Date.now() / 1e3) + 3600;

const getSpaceMock = jest.spyOn(actionHelper, 'getSpace');
getSpaceMock.mockResolvedValue(spacesGetSpaceFixtures);

function body(id: string, address = AUTHOR) {
  return {
    address,
    msg: JSON.stringify({ space: SPACE, payload: { proposal: id } })
  };
}

async function seed(
  id: string,
  privacy: string,
  start: number,
  scoresState = 'pending'
): Promise<void> {
  await db.queryAsync('DELETE FROM proposals WHERE id = ?', [id]);
  await db.queryAsync('INSERT INTO proposals SET ?', {
    id,
    ipfs: `bafkrei${id.slice(-12)}`,
    author: AUTHOR,
    created: 1,
    space: SPACE,
    network: '1',
    symbol: '',
    type: 'basic',
    strategies: '[]',
    validation: '{}',
    plugins: '{}',
    title: 'deletion fixture',
    body: '',
    discussion: '',
    choices: JSON.stringify(['Yes', 'No']),
    start,
    end: start + 100,
    quorum: 0,
    privacy,
    snapshot: 1,
    app: '',
    scores: '[]',
    scores_by_strategy: '[]',
    scores_state: scoresState,
    scores_total: 0,
    scores_updated: 0,
    vp_value_by_strategy: '[]',
    votes: 0
  });
}

async function exists(id: string): Promise<boolean> {
  const rows = await db.queryAsync('SELECT id FROM proposals WHERE id = ?', [
    id
  ]);
  return rows.length > 0;
}

describe('delete-proposal: private proposals', () => {
  afterAll(async () => {
    await db.queryAsync('DELETE FROM proposals WHERE space = ?', [SPACE]);
    await db.queryAsync('DELETE FROM votes WHERE space = ?', [SPACE]);
    await db.endAsync();
    await sequencerDB.endAsync();
  });

  // Every stage of the lifecycle, because the whole point is that none of them is
  // treated specially — a private proposal is no harder to delete than any other.
  it.each([
    ['before voting starts', FUTURE, 'pending'],
    ['while voting is open', Math.floor(Date.now() / 1e3) - 10, 'pending'],
    ['after voting closed, tally pending', PAST, 'pending'],
    ['after the result is published', PAST, 'final']
  ])('allows deletion %s', async (label, start, scoresState) => {
    const id = `0xdel-${label.replace(/[^a-z]/gi, '').slice(0, 20)}`;
    await seed(id, 'shutter-elgamal', start, scoresState);
    await expect(verify(body(id))).resolves.not.toThrow();
  });

  it('still refuses someone with no claim on the proposal', async () => {
    const id = '0xdel-stranger';
    await seed(id, 'shutter-elgamal', PAST);
    await expect(verify(body(id, STRANGER))).rejects.toMatch(/not authorized/);
    expect(await exists(id)).toBe(true);
  });

  // D14: the public path is untouched by any of this.
  it('still allows deleting a public proposal after voting starts', async () => {
    const id = '0xdel-public-started';
    await seed(id, '', PAST);
    await expect(verify(body(id))).resolves.not.toThrow();
  });

  // The private-specific part. No foreign keys exist, so nothing cascades: without
  // the explicit deletes these rows outlive the proposal.
  it('removes the committee artifacts along with the proposal', async () => {
    const id = '0xdel-private-children';
    await seed(id, 'shutter-elgamal', PAST, 'final');
    await db.queryAsync('INSERT INTO te_results SET ?', {
      proposal_id: id,
      totals_json: '["1"]',
      keyper_indices: '[1,2]',
      bsgs_bound: '100',
      signature: `0x${'11'.repeat(65)}`,
      posted_at: 1
    });
    await db.queryAsync('INSERT INTO te_decryption_shares SET ?', {
      proposal_id: id,
      keyper_index: 1,
      candidate: 0,
      sigma: Buffer.alloc(96, 1),
      proof_e: Buffer.alloc(32, 1),
      proof_z: Buffer.alloc(32, 1),
      posted_at: 1
    });
    await db.queryAsync('INSERT INTO te_dkg_submissions SET ?', {
      proposal_id: id,
      keyper_index: 1,
      keyper_address: AUTHOR,
      mpk_hex: `0x${'aa'.repeat(96)}`,
      committee_pks_hex: '[]',
      signature: `0x${'22'.repeat(65)}`,
      posted_at: 1
    });

    await action(body(id));

    expect(await exists(id)).toBe(false);
    for (const table of [
      'te_results',
      'te_decryption_shares',
      'te_dkg_submissions',
      'te_aggregate_submissions'
    ]) {
      const rows = await db.queryAsync(
        `SELECT proposal_id FROM ${table} WHERE proposal_id = ?`,
        [id]
      );
      expect({ table, orphans: rows.length }).toEqual({ table, orphans: 0 });
    }
  });

  // Mirrors the public path rather than hard-deleting. The ciphertexts stay, and
  // are unreachable: te_geg_ballots 404s without the proposal row.
  it('soft-deletes the ballots, exactly as a public proposal does', async () => {
    const id = '0xdel-private-ballots';
    await seed(id, 'shutter-elgamal', PAST, 'final');
    await db.queryAsync('INSERT INTO votes SET ?', {
      id: '0xdel-vote-1',
      ipfs: 'bafkreidelvote',
      voter: AUTHOR,
      created: 1,
      space: SPACE,
      proposal: id,
      choice: '{"ciphertexts":[]}',
      metadata: '{}',
      reason: '',
      app: '',
      vp: 1,
      vp_by_strategy: '[1]',
      vp_state: 'final',
      cb: 0
    });

    await action(body(id));

    const [vote] = await db.queryAsync('SELECT cb FROM votes WHERE id = ?', [
      '0xdel-vote-1'
    ]);
    expect(Number(vote.cb)).toBe(CB.PENDING_DELETE);
  });
});
