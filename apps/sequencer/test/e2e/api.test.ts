import fetch from 'node-fetch';
import db from '../../src/helpers/mysql';
import proposalInput from '../fixtures/ingestor-payload/proposal.json';
import proposalsFixtures from '../fixtures/proposal';
import { spacesSqlFixtures } from '../fixtures/space';

const HOST = `http://localhost:${process.env.PORT || 3003}`;
const SPACE_PREFIX = 'e2e-';

async function getFlaggedSpacesCount() {
  return (
    await db.queryAsync(
      'SELECT COUNT(id) as count FROM spaces WHERE flagged = 1'
    )
  )[0].count;
}

async function flagSpace(space: string, action = 'flag') {
  return await fetch(`${HOST}/flag`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', secret: '0' },
    body: JSON.stringify({
      type: 'space',
      value: `${SPACE_PREFIX}${space}`,
      action
    })
  });
}

describe('POST /', () => {
  describe('on invalid client input', () => {
    it('returns a 400 error', async () => {
      const response = await fetch(HOST, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proposalInput)
      });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('client_error');
      expect(body.error_description).toBe('wrong timestamp');
    });
  });
});

describe('POST /flag', () => {
  afterAll(() => {
    db.endAsync();
  });

  beforeEach(async () => {
    await db.queryAsync(
      `
      DELETE FROM snapshot_sequencer_test.spaces WHERE id LIKE ?;
      TRUNCATE TABLE snapshot_sequencer_test.proposals
    `,
      [`${SPACE_PREFIX}%`]
    );

    await Promise.all(
      spacesSqlFixtures
        .map(space => ({
          ...space,
          id: `${SPACE_PREFIX}${space.id}`,
          settings: JSON.stringify(space.settings)
        }))
        .map(async space => {
          return db.queryAsync(
            'INSERT INTO snapshot_sequencer_test.spaces SET ?',
            space
          );
        })
    );

    await Promise.all(
      proposalsFixtures
        .map(proposal => ({
          ...proposal,
          strategies: JSON.stringify(proposal.strategies),
          validation: JSON.stringify(proposal.validation),
          plugins: JSON.stringify(proposal.plugins),
          choices: JSON.stringify(proposal.choices),
          scores: JSON.stringify(proposal.scores),
          scores_by_strategy: JSON.stringify(proposal.scores_by_strategy),
          vp_value_by_strategy: JSON.stringify(
            proposal.vp_value_by_strategy || []
          )
        }))
        .map(async proposal => {
          return db.queryAsync(
            'INSERT INTO snapshot_sequencer_test.proposals SET ?',
            proposal
          );
        })
    );
  });

  it('returns a 401 error when not authorized', async () => {
    const response = await fetch(`${HOST}/flag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    expect(response.status).toBe(401);
  });

  describe('when flagging a space', () => {
    it('does nothing when the space does not exist', async () => {
      const beforeFlaggedSpacesCount = await getFlaggedSpacesCount();
      const response = await flagSpace('test-not-exist.eth');
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(false);
      expect(await getFlaggedSpacesCount()).toBe(beforeFlaggedSpacesCount);
    });

    it('return true when the space is already flagged', async () => {
      await db.queryAsync(
        'UPDATE spaces SET flagged = 1 WHERE id = ?',
        `${SPACE_PREFIX}test.eth`
      );

      const response = await flagSpace('test.eth');
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(await getFlaggedSpacesCount()).toBe(1);
    });

    it('flags the space when it exists', async () => {
      const response = await flagSpace('test.eth');
      const body = await response.json();

      expect(body).toEqual({ success: true });
      expect(
        (await db.queryAsync('SELECT id FROM spaces WHERE flagged = 1')).map(
          r => r.id
        )
      ).toEqual([`${SPACE_PREFIX}test.eth`]);
    });
  });

  describe('when un-flagging a space', () => {
    it('does nothing when the space does not exist', async () => {
      const beforeFlaggedSpacesCount = await getFlaggedSpacesCount();

      const response = await flagSpace('test-not-exist.eth', 'unflag');
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(false);
      expect(await getFlaggedSpacesCount()).toBe(beforeFlaggedSpacesCount);
    });

    it('returns true when the space is not flagged', async () => {
      const beforeFlaggedSpacesCount = await getFlaggedSpacesCount();
      const response = await flagSpace('test.eth', 'unflag');
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(await getFlaggedSpacesCount()).toBe(beforeFlaggedSpacesCount);
    });

    it('un-flags the space when it is flagged', async () => {
      await db.queryAsync(
        'UPDATE spaces SET flagged = 1 WHERE id = ?',
        `${SPACE_PREFIX}test.eth`
      );

      const response = await flagSpace('test.eth', 'unflag');
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(await getFlaggedSpacesCount()).toBe(0);
    });
  });
});
