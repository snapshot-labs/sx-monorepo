import { PROPOSAL_FEE, VOTE_FEE } from '../../../src/constants';
import { getSpace } from '../../../src/helpers/actions';
import db, { sequencerDB } from '../../../src/helpers/mysql';
import { mergeSpaces, updateTurboStatuses } from '../../../src/helpers/turbo';
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

function proposalInput(space = SPACE) {
  const msg = JSON.parse(input.msg);
  msg.space = space;
  return { ...input, msg: JSON.stringify(msg) };
}

function vote(
  voter: string,
  proposal: string,
  credits: number,
  timestamp = now(),
  space = SPACE
) {
  const body = {
    address: voter,
    msg: JSON.stringify({
      space,
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
  // Before each test too, so rows left by an interrupted run can't interfere
  async function cleanup() {
    await db.queryAsync('DELETE FROM spaces WHERE id = ?', [SPACE]);
    const spaces = [SPACE, SPACE.toUpperCase()];
    await db.queryAsync('DELETE FROM proposals WHERE space IN (?)', [spaces]);
    await db.queryAsync('DELETE FROM votes WHERE space IN (?)', [spaces]);
    await db.queryAsync('DELETE FROM leaderboard WHERE space IN (?)', [spaces]);
  }

  beforeEach(cleanup);

  afterAll(async () => {
    await cleanup();
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
    async function getProposal(id: string) {
      const [proposal] = await db.queryAsync(
        'SELECT credits FROM proposals WHERE id = ?',
        [id]
      );
      return proposal;
    }

    it('charges a Plus proposal and flags it', async () => {
      await setSpace({ credits_deposited: PROPOSAL_FEE });
      await proposalAction(proposalInput(), 'ipfs', 'receipt', '0xplus-1', {
        plus: true
      });

      expect((await getProposal('0xplus-1')).credits).toBe(1);
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
      await proposalAction(proposalInput(), 'ipfs', 'receipt', '0xplus-3');

      expect((await getProposal('0xplus-2')).credits).toBe(0);
      expect((await getProposal('0xplus-3')).credits).toBe(0);
      expect((await getCredits()).credits_spent).toBe(0);
    });

    it('charges a proposal checked as Plus even if the balance ran out since', async () => {
      await setSpace({ credits_deposited: PROPOSAL_FEE, credits_spent: 1 });
      await proposalAction(proposalInput(), 'ipfs', 'receipt', '0xplus-4', {
        plus: true
      });

      expect((await getProposal('0xplus-4')).credits).toBe(1);
      expect((await getCredits()).credits_spent).toBe(PROPOSAL_FEE + 1);
    });

    it('charges the space when the message spells its id in another case', async () => {
      await setSpace({ credits_deposited: PROPOSAL_FEE });
      await proposalAction(
        proposalInput(SPACE.toUpperCase()),
        'ipfs',
        'receipt',
        '0xplus-6',
        { plus: true }
      );

      expect((await getCredits()).credits_spent).toBe(PROPOSAL_FEE);
    });

    it('does not charge a proposal that cannot be stored', async () => {
      await setSpace({ credits_deposited: 2 * PROPOSAL_FEE });
      await proposalAction(proposalInput(), 'ipfs', 'receipt', '0xplus-5', {
        plus: true
      });
      // Same id again: the insert fails on the primary key
      await expect(
        proposalAction(proposalInput(), 'ipfs', 'receipt', '0xplus-5', {
          plus: true
        })
      ).rejects.toBeTruthy();

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

    it('charges the space when the vote spells its id in another case', async () => {
      await setSpace({ credits_deposited: PROPOSAL_FEE });
      await vote('0xA1', '0xplus-p', 1, now(), SPACE.toUpperCase());

      expect((await getCredits()).credits_spent).toBe(VOTE_FEE);
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

  describe('mergeSpaces()', () => {
    it('keeps the latest expiration and the onchain credits of each space', () => {
      expect(
        mergeSpaces([
          { id: 's:a.eth', turbo_expiration: 100, credits: '5000' },
          { id: 's:a.eth', turbo_expiration: 200, credits: '0' }, // Stripe
          { id: 's:A.ETH', turbo_expiration: 50, credits: '0' },
          { id: 's-tn:a.eth', turbo_expiration: 900, credits: '9000' },
          { id: 's:b.eth', turbo_expiration: 0, credits: 'bad' }
        ])
      ).toEqual([
        { id: 'a.eth', turbo_expiration: 200, credits: 5000 },
        { id: 'b.eth', turbo_expiration: 0, credits: 0 }
      ]);
    });
  });

  describe('updateTurboStatuses()', () => {
    const OTHER = 'plus-other.eth';

    afterEach(async () => {
      await db.queryAsync('DELETE FROM spaces WHERE id = ?', [OTHER]);
    });

    it('copies the expiration and the deposits of each space', async () => {
      await setSpace({ credits_deposited: 0, credits_spent: VOTE_FEE });
      await db.queryAsync('INSERT INTO spaces SET ?', {
        id: OTHER,
        name: 'Other',
        settings,
        created: now(),
        updated: now()
      });
      await updateTurboStatuses([
        { id: OTHER, turbo_expiration: 5678, credits: 7 },
        { id: SPACE, turbo_expiration: 1234, credits: 3 * PROPOSAL_FEE }
      ]);

      const rows = await db.queryAsync(
        'SELECT id, turbo_expiration, credits_deposited, credits_spent FROM spaces WHERE id IN (?) ORDER BY id',
        [[SPACE, OTHER]]
      );
      expect(rows).toEqual([
        {
          id: SPACE,
          turbo_expiration: 1234,
          credits_deposited: 3 * PROPOSAL_FEE,
          credits_spent: VOTE_FEE
        },
        {
          id: OTHER,
          turbo_expiration: 5678,
          credits_deposited: 7,
          credits_spent: 0
        }
      ]);
    });

    it('never lets a look-alike id overwrite a space', async () => {
      await setSpace({ credits_deposited: PROPOSAL_FEE, turbo_expiration: 99 });
      // Same row for the column's collation, but not the same space
      await updateTurboStatuses([
        { id: 'plus-crédits.eth', turbo_expiration: 0, credits: 0 }
      ]);

      expect(
        (
          await db.queryAsync(
            'SELECT turbo_expiration, credits_deposited FROM spaces WHERE id = ?',
            [SPACE]
          )
        )[0]
      ).toEqual({ turbo_expiration: 99, credits_deposited: PROPOSAL_FEE });
    });
  });
});
