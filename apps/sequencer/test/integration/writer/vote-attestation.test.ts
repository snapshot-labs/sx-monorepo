/**
 * The eligibility credential is stored inside the vote's `choice` blob, on the
 * same row as the vote. A re-vote replaces both together, so a vote can never be
 * left without its credential (the hub would refuse to serve it and the tally
 * would stall).
 */

import { initCurves } from '@shutter-network/urban-verified-crypto';
import db, { sequencerDB } from '../../../src/helpers/mysql';
import {
  mintAttestation,
  resetIssuer
} from '../../../src/helpers/sgpAttestation';
import * as scores from '../../../src/scores';
import { action } from '../../../src/writer/vote';
import { insertProposal } from '../../fixtures/proposal';

const SPACE = 'test.eth';
// Not the author address other suites use. `action()` creates a `leaderboard`
// row for the voter, and another suite's `delete-proposal` test would decrement
// `proposal_count` on it from zero, underflowing the unsigned column.
const VOTER = '0x000000000000000000000000000000000A77E571';
const ISSUER_SK =
  '0x0000000000000000000000000000000000000000000000000000000000002a2a';

// action() recomputes scores at the end, which calls the score API for a public
// proposal. Stubbed so these tests cover only the write.
jest.spyOn(scores, 'updateProposalAndVotes').mockResolvedValue(true);

const PSEUDONYM = `0x${'22'.repeat(32)}`;
const VK = `0x${'ab'.repeat(48)}`;

function envelope() {
  return {
    electionId: `0x${'11'.repeat(32)}`,
    pseudonym: PSEUDONYM,
    vk: VK,
    ciphertexts: [],
    zkProof: '0x',
    voterSignature: `0x${'00'.repeat(80)}`,
    wrAttestation: '0x'
  };
}

function body(
  proposalId: string,
  timestamp: number,
  credentialEnvelope: Record<string, unknown>
) {
  return {
    address: VOTER,
    msg: JSON.stringify({
      space: SPACE,
      timestamp: String(timestamp),
      payload: {
        proposal: proposalId,
        // The credential goes inside `choice`, because that is what the voter
        // signed. `action()` stores it as is.
        choice: { ...envelope(), ...credentialEnvelope },
        metadata: {},
        app: '',
        reason: ''
      }
    })
  };
}

function context(attestation: any) {
  return {
    proposal: { id: 'unused', strategies: [] },
    vp: { vp: 42, vp_by_strategy: [42], vp_state: 'final' },
    attestation
  };
}

function seedProposal(id: string) {
  return insertProposal({
    id,
    author: VOTER,
    type: 'weighted',
    choices: JSON.stringify(['A', 'B']),
    privacy: 'shutter-elgamal'
  });
}

async function voteRow(proposalId: string): Promise<any> {
  const rows = await db.queryAsync(
    'SELECT id, created, choice FROM votes WHERE proposal = ? AND voter = ?',
    [proposalId, VOTER]
  );
  if (!rows[0]) return undefined;
  const choice =
    typeof rows[0].choice === 'string'
      ? JSON.parse(rows[0].choice)
      : rows[0].choice;
  return { ...rows[0], choice, credential: choice?.attestation };
}

describe('vote: the credential is written with the vote', () => {
  beforeAll(async () => {
    process.env.TE_ELIGIBILITY_PRIVATE_KEY = ISSUER_SK;
    resetIssuer();
    await initCurves();
  });

  afterAll(async () => {
    await db.queryAsync('DELETE FROM votes WHERE space = ?', [SPACE]);
    await db.queryAsync('DELETE FROM proposals WHERE space = ?', [SPACE]);
    // Remove the leaderboard row `action()` created, so other suites start clean.
    await db.queryAsync(
      'DELETE FROM leaderboard WHERE space = ? AND user = ?',
      [SPACE, VOTER]
    );
    await db.endAsync();
    await sequencerDB.endAsync();
  });

  beforeEach(async () => {
    await db.queryAsync('DELETE FROM votes WHERE space = ?', [SPACE]);
  });

  async function credential(proposalId: string, weight: bigint, nonce: bigint) {
    const signature = await mintAttestation({
      electionId: proposalId,
      pseudonym: PSEUDONYM,
      vk: VK,
      weight,
      nonce
    });
    return {
      weight: Number(weight),
      nonce: Number(nonce),
      signature,
      // `action()` does not check this; `verify()` does, and
      // `helpers/teBallotVerify.test.ts` covers the crypto.
      bindingSignature: `0x${'be'.repeat(80)}`
    };
  }

  /** The credential as it rides inside `choice`, signed by the issuer. */
  async function credentialEnvelope(id: string, weight: bigint, nonce: bigint) {
    const att = await credential(id, weight, nonce);
    return {
      attestation: {
        scheme: 'ATTESTATION_V1',
        electionId: id,
        pseudonym: PSEUDONYM,
        vk: VK,
        weight: att.weight,
        nonce: att.nonce,
        signature: att.signature
      }
    };
  }

  // A re-vote overwrites the row, so the old credential goes away with the old
  // ballot.
  it('replaces the credential on a re-vote, carrying the new nonce', async () => {
    const id = `0x${'a2'.repeat(32)}`;
    await seedProposal(id);

    await action(
      body(id, 1_700_000_000, await credentialEnvelope(id, 3n, 1n)),
      'ipfs1',
      {},
      '0xvote1',
      context(await credential(id, 3n, 1n))
    );

    const second = 1_700_000_060;
    await action(
      body(id, second, await credentialEnvelope(id, 9n, 2n)),
      'ipfs2',
      {},
      '0xvote2',
      context(await credential(id, 9n, 2n))
    );

    const rows = await db.queryAsync(
      'SELECT id, created FROM votes WHERE proposal = ? AND voter = ?',
      [id, VOTER]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('0xvote2');
    expect(rows[0].created).toBe(second);

    const row = await voteRow(id);
    // The newer credential, with the issuer's higher nonce.
    expect(row.credential.nonce).toBe(2);
    expect(row.credential.weight).toBe(9);
  });

  // The window is checked on arrival, but slow steps after that can pass `end`.
  // By then the committee may have summed the ballots, so a vote written now would
  // be confirmed but never counted.
  it('refuses to store a private vote once voting has closed', async () => {
    const id = `0x${'a5'.repeat(32)}`;
    await seedProposal(id);
    const carried = await credentialEnvelope(id, 7n, 1n);
    const closed = {
      ...context(await credential(id, 7n, 1n)),
      proposal: {
        id,
        strategies: [],
        privacy: 'shutter-elgamal',
        end: Math.floor(Date.now() / 1e3) - 1
      }
    };

    await expect(
      action(body(id, 1_700_000_000, carried), 'ipfs1', {}, '0xvote1', closed)
    ).rejects.toBe('not in voting window');
    expect(await voteRow(id)).toBeUndefined();
  });
});
