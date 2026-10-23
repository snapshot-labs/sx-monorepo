import { getSpace } from '../../../src/helpers/actions';
import {
  chargeProposal,
  PROPOSAL_FEE,
  VOTE_FEE
} from '../../../src/helpers/credits';
import db, { sequencerDB } from '../../../src/helpers/mysql';
import { updateTurboStatuses } from '../../../src/helpers/turbo';
import { action as proposalAction } from '../../../src/writer/proposal';
import { action as voteAction } from '../../../src/writer/vote';
import input from '../../fixtures/writer-payload/proposal.json';

jest.mock('../../../src/scores', () => ({
  updateProposalAndVotes: jest.fn().mockResolvedValue(true)
}));

const SPACE = 'plus-credits.eth';
const settings = JSON.stringify({
  name: 'Plus',
  network: '1',
  symbol: 'PLUS',
  strategies: [{ name: 'basic' }]
});
const now = () => Math.floor(Date.now() / 1e3);

async function setSpace(values: Record<string, number>) {
  await db.queryAsync('DELETE FROM spaces WHERE id = ?', [SPACE]);
  await db.queryAsync('INSERT INTO spaces SET ?', {
    id: SPACE,
    name: 'Plus',
    settings,
    created: now(),
    updated: now(),
    ...values
  });
}

async function getCredits() {
  const [space] = await db.queryAsync(
    'SELECT credits_deposited, credits_spent FROM spaces WHERE id = ?',
    [SPACE]
  );
  return space;
}

function proposalInput() {
  const msg = JSON.parse(input.msg);
  msg.space = SPACE;
  return { ...input, msg: JSON.stringify(msg) };
}

function vote(
  voter: string,
  proposal: string,
  credits: number,
  timestamp = now()
) {
  const body = {
    address: voter,
    msg: JSON.stringify({
      space: SPACE,
      timestamp,
      payload: { proposal, choice: 1, reason: '', app: '', metadata: {} }
    })
  };
  const context = {
    proposal: { strategies: [{ name: 'basic' }], credits },
    vp: { vp: 1, vp_by_strategy: [1], vp_state: 'final' }
  };
  return voteAction(body, 'ipfs', 'receipt', `${voter}-${timestamp}`, context);
}

describe('Snapshot Plus credits', () => {
  afterEach(async () => {
    await db.queryAsync('DELETE FROM spaces WHERE id = ?', [SPACE]);
    await db.queryAsync('DELETE FROM proposals WHERE space = ?', [SPACE]);
    await db.queryAsync('DELETE FROM votes WHERE space = ?', [SPACE]);
    await db.queryAsync('DELETE FROM leaderboard WHERE space = ?', [SPACE]);
  });

  afterAll(async () => {
    await db.endAsync();
    await sequencerDB.endAsync();
  });

  describe('getSpace()', () => {
    it('is Plus, with every Pro feature, while the balance covers a proposal', async () => {
      await setSpace({ credits_deposited: PROPOSAL_FEE });
      expect(await getSpace(SPACE)).toMatchObject({ plus: true, turbo: true });
    });

    it('is not Plus below one proposal', async () => {
      await setSpace({ credits_deposited: PROPOSAL_FEE, credits_spent: 1 });
      expect(await getSpace(SPACE)).toMatchObject({
        plus: false,
        turbo: false
      });
    });

    it('is not Plus with a negative balance', async () => {
      await setSpace({ credits_deposited: 0, credits_spent: VOTE_FEE });
      expect(await getSpace(SPACE)).toMatchObject({
        plus: false,
        turbo: false
      });
    });

    it('is Pro, not Plus, with an active subscription', async () => {
      await setSpace({
        credits_deposited: 10 * PROPOSAL_FEE,
        turbo_expiration: now() + 3600
      });
      expect(await getSpace(SPACE)).toMatchObject({ plus: false, turbo: true });
    });
  });

  describe('proposals', () => {
    it('charges a Plus proposal and flags it', async () => {
      await setSpace({ credits_deposited: PROPOSAL_FEE });
      await proposalAction(proposalInput(), 'ipfs', 'receipt', '0xplus-1', {
        plus: true
      });

      const [proposal] = await db.queryAsync(
        'SELECT credits FROM proposals WHERE id = ?',
        ['0xplus-1']
      );
      expect(proposal.credits).toBe(1);
      expect(await getCredits()).toEqual({
        credits_deposited: PROPOSAL_FEE,
        credits_spent: PROPOSAL_FEE
      });
    });

    it('does not charge a proposal checked without Plus', async () => {
      await setSpace({ credits_deposited: PROPOSAL_FEE });
      await proposalAction(proposalInput(), 'ipfs', 'receipt', '0xplus-2', {
        plus: false
      });

      const [proposal] = await db.queryAsync(
        'SELECT credits FROM proposals WHERE id = ?',
        ['0xplus-2']
      );
      expect(proposal.credits).toBe(0);
      expect((await getCredits()).credits_spent).toBe(0);
    });

    it('rejects a Plus proposal once the balance no longer covers it', async () => {
      await setSpace({ credits_deposited: PROPOSAL_FEE, credits_spent: 1 });
      await expect(
        proposalAction(proposalInput(), 'ipfs', 'receipt', '0xplus-3', {
          plus: true
        })
      ).rejects.toBe('not enough Snapshot Plus credits');
      expect(
        await db.queryAsync('SELECT id FROM proposals WHERE id = ?', [
          '0xplus-3'
        ])
      ).toHaveLength(0);
    });

    it('refunds the charge when the proposal cannot be stored', async () => {
      await setSpace({ credits_deposited: 2 * PROPOSAL_FEE });
      await proposalAction(proposalInput(), 'ipfs', 'receipt', '0xplus-4', {
        plus: true
      });
      // Same id again: the insert fails on the primary key
      await expect(
        proposalAction(proposalInput(), 'ipfs', 'receipt', '0xplus-4', {
          plus: true
        })
      ).rejects.toBeTruthy();
      expect((await getCredits()).credits_spent).toBe(PROPOSAL_FEE);
    });

    it('lets only one of two concurrent proposals spend a balance that covers one', async () => {
      await setSpace({ credits_deposited: PROPOSAL_FEE });
      const results = await Promise.allSettled([
        chargeProposal(SPACE),
        chargeProposal(SPACE)
      ]);

      expect(results.map(r => r.status).sort()).toEqual([
        'fulfilled',
        'rejected'
      ]);
      expect((await getCredits()).credits_spent).toBe(PROPOSAL_FEE);
    });
  });

  describe('votes', () => {
    it('charges new votes on a Plus proposal, even into a negative balance', async () => {
      await setSpace({ credits_deposited: 0 });
      await vote('0xA1', '0xplus-p', 1);
      await vote('0xA2', '0xplus-p', 1);

      const { credits_deposited, credits_spent } = await getCredits();
      expect(credits_deposited - credits_spent).toBe(-2 * VOTE_FEE);
    });

    it('does not charge a re-vote', async () => {
      await setSpace({ credits_deposited: PROPOSAL_FEE });
      await vote('0xA1', '0xplus-p', 1, now() - 10);
      await vote('0xA1', '0xplus-p', 1, now());

      expect((await getCredits()).credits_spent).toBe(VOTE_FEE);
    });

    it('does not charge votes on a proposal not paid with credits', async () => {
      await setSpace({ credits_deposited: PROPOSAL_FEE });
      await vote('0xA1', '0xfree-p', 0);

      expect((await getCredits()).credits_spent).toBe(0);
    });

    it('does not charge votes while a subscription is active', async () => {
      await setSpace({
        credits_deposited: PROPOSAL_FEE,
        turbo_expiration: now() + 3600
      });
      await vote('0xA1', '0xplus-p', 1);

      expect((await getCredits()).credits_spent).toBe(0);
    });
  });

  describe('updateTurboStatuses()', () => {
    it('copies the expiration and the deposits from schnaps-api', async () => {
      await setSpace({ credits_deposited: 0, credits_spent: VOTE_FEE });
      await updateTurboStatuses([
        { id: SPACE, turbo_expiration: 1234, credits: 3 * PROPOSAL_FEE }
      ]);

      const [space] = await db.queryAsync(
        'SELECT turbo_expiration, credits_deposited, credits_spent FROM spaces WHERE id = ?',
        [SPACE]
      );
      expect(space).toEqual({
        turbo_expiration: 1234,
        credits_deposited: 3 * PROPOSAL_FEE,
        credits_spent: VOTE_FEE
      });
    });
  });
});
