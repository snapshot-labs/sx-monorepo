import db, { sequencerDB } from '../../../src/helpers/mysql';
import { action, verify } from '../../../src/writer/unfollow';
import { spacesSqlFixtures } from '../../fixtures/space';

describe('writer/unfollow', () => {
  const TEST_PREFIX = 'test-unfollow-';
  const space = spacesSqlFixtures[0];
  const followerId = '0x0';

  afterAll(async () => {
    await db.queryAsync('DELETE FROM follows');
    await db.queryAsync('DELETE FROM spaces WHERE id LIKE ?', [
      `${TEST_PREFIX}-%`
    ]);
    await db.endAsync();
    await sequencerDB.endAsync();
  });

  describe('verify()', () => {
    beforeAll(async () => {
      let i = 0;
      const promises: Promise<any>[] = [];

      while (i <= 2) {
        promises.push(
          db.queryAsync(
            'INSERT INTO follows SET id = ?, ipfs = ?, follower = ?, space = ?, network = ?, created = ?',
            [i, i, followerId, `${TEST_PREFIX}-test-${i}.eth`, 's', i]
          )
        );

        i++;
      }

      await Promise.all(promises);
    });

    it('rejects when the user has not followed the space', () => {
      return expect(
        verify({ from: '0x1', space: `${TEST_PREFIX}-test-2.eth` })
      ).rejects.toEqual('you can only unfollow a space you follow');
    });

    it('returns true when the user has followed the space', () => {
      return expect(
        verify({
          from: followerId,
          space: `${TEST_PREFIX}-test-0.eth`,
          network: 's'
        })
      ).resolves.toEqual(true);
    });
  });

  describe('action()', () => {
    it('should unfollow and decrement the follower count of the space', async () => {
      await db.queryAsync('INSERT INTO spaces SET ?', {
        ...space,
        id: `${TEST_PREFIX}-test-0.eth`,
        settings: JSON.stringify(space.settings),
        follower_count: 2
      });

      const message = {
        from: followerId,
        space: `${TEST_PREFIX}-test-0.eth`,
        network: 's'
      };

      expect(
        db.queryAsync(
          'SELECT id FROM follows WHERE follower = ? AND space = ?',
          [message.from, message.space]
        )
      ).resolves.not.toEqual([]);

      await action(message);

      expect(
        db.queryAsync(
          'SELECT * FROM follows WHERE follower = ? AND space = ?',
          [message.from, message.space]
        )
      ).resolves.toEqual([]);
      return expect(
        db.queryAsync('SELECT follower_count FROM spaces WHERE id = ?', [
          message.space
        ])
      ).resolves.toEqual([{ follower_count: 1 }]);
    });
  });
});
