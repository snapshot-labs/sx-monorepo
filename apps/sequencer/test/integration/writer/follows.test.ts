import db, { sequencerDB } from '../../../src/helpers/mysql';
import { action, verify } from '../../../src/writer/follow';
import { spacesSqlFixtures } from '../../fixtures/space';

const LIMIT = 10;

jest.mock('../../../src/helpers/options', () => {
  const originalModule = jest.requireActual('../../../src/helpers/options');

  return {
    __esModule: true,
    ...originalModule,
    getLimit: () => LIMIT
  };
});

describe('writer/follow', () => {
  const TEST_PREFIX = 'test-follow-';
  const space = spacesSqlFixtures[1];

  afterAll(async () => {
    await db.queryAsync('DELETE FROM follows');
    await db.queryAsync('DELETE FROM spaces WHERE id LIKE ?', [
      `${TEST_PREFIX}%`
    ]);
    await db.endAsync();
    await sequencerDB.endAsync();
  });

  describe('verify()', () => {
    const followerId = '0x0';

    beforeAll(async () => {
      let i = 1;
      const promises: Promise<any>[] = [];

      while (i <= LIMIT) {
        promises.push(
          db.queryAsync('INSERT INTO snapshot_sequencer_test.spaces SET ?', {
            ...space,
            id: `${TEST_PREFIX}${i}.eth`,
            deleted: 0,
            settings: JSON.stringify(space.settings)
          })
        );
        promises.push(
          db.queryAsync(
            'INSERT INTO follows SET id = ?, ipfs = ?, follower = ?, space = ?, created = ?',
            [i, i, followerId, `${TEST_PREFIX}${i}.eth`, i]
          )
        );

        i++;
      }

      await Promise.all(promises);
    });

    it('rejects when the user has followed too much spaces', () => {
      return expect(verify({ from: followerId })).rejects.toEqual(
        `you can join max ${LIMIT} spaces`
      );
    });

    it('ignores deleted spaces from the limit', async () => {
      await db.queryAsync(
        'UPDATE snapshot_sequencer_test.spaces SET deleted = 1 WHERE id = ?',
        [`${TEST_PREFIX}1.eth`]
      );

      await expect(verify({ from: followerId })).resolves.toEqual(true);

      return db.queryAsync(
        'UPDATE snapshot_sequencer_test.spaces SET deleted = 0 WHERE id = ?',
        [`${TEST_PREFIX}1.eth`]
      );
    });

    it('returns true when the user has not reached the limit', () => {
      return expect(verify({ from: '0x1' })).resolves.toEqual(true);
    });

    it('rejects when the network is not allowed', () => {
      return expect(
        verify({ from: '0x1', network: 'not-allowed' })
      ).rejects.toEqual('network not-allowed is not allowed');
    });
  });

  describe('action()', () => {
    describe('without a network', () => {
      it('inserts a new follow with a default network', async () => {
        const id = '1';
        const ipfs = '2';
        const message = {
          from: '0x2',
          space: 'test.eth',
          timestamp: 1
        };

        await action(message, ipfs, 1, id);

        return expect(
          db.queryAsync('SELECT * FROM follows WHERE follower = ?', [
            message.from
          ])
        ).resolves.toEqual([
          {
            id,
            ipfs,
            follower: '0x2',
            space: 'test.eth',
            network: 's',
            created: 1
          }
        ]);
      });
    });

    describe('with a network', () => {
      it('inserts a new follow with the given network', async () => {
        const id = '2';
        const ipfs = '3';
        const message = {
          from: '0x3',
          space: 'test.eth',
          timestamp: 1,
          network: 'sep'
        };

        await action(message, ipfs, 1, id);

        return expect(
          db.queryAsync('SELECT * FROM follows WHERE follower = ?', [
            message.from
          ])
        ).resolves.toEqual([
          {
            id,
            ipfs,
            follower: '0x3',
            space: 'test.eth',
            network: 'sep',
            created: 1
          }
        ]);
      });
    });

    it('should increment the follower count of the space', async () => {
      await db.queryAsync('INSERT INTO spaces SET ?', {
        ...space,
        id: `${TEST_PREFIX}${space.id}`,
        settings: JSON.stringify(space.settings)
      });

      const id = '3';
      const ipfs = '4';
      const message = {
        from: '0x4',
        space: `${TEST_PREFIX}${space.id}`,
        timestamp: 1
      };

      await action(message, ipfs, 1, id);

      return expect(
        db.queryAsync('SELECT follower_count FROM spaces WHERE id = ?', [
          message.space
        ])
      ).resolves.toEqual([{ follower_count: 1 }]);
    });
  });
});
