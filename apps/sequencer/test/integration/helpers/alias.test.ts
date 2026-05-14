import { isExistingAlias } from '../../../src/helpers/alias';
import db, { sequencerDB } from '../../../src/helpers/mysql';
import { action, verify } from '../../../src/writer/alias';
import { aliasesSqlFixtures } from '../../fixtures/alias';

const buildAliasMsg = (
  alias: string,
  timestamp = Math.floor(Date.now() / 1000)
) => ({
  version: '0.1.4',
  timestamp,
  type: 'alias',
  payload: { alias }
});

const cleanupFixtures = () => {
  const tuples = aliasesSqlFixtures.map(() => '(?, ?)').join(', ');
  const params = aliasesSqlFixtures.flatMap(a => [a.address, a.alias]);
  return db.queryAsync(
    `DELETE FROM snapshot_sequencer_test.aliases WHERE (address, alias) IN (${tuples})`,
    params
  );
};

describe('alias', () => {
  beforeEach(async () => {
    await cleanupFixtures();
    await Promise.all(
      aliasesSqlFixtures.map(alias =>
        db.queryAsync(
          'INSERT INTO snapshot_sequencer_test.aliases SET ?',
          alias
        )
      )
    );
  });

  afterAll(async () => {
    await cleanupFixtures();
    await db.endAsync();
    await sequencerDB.endAsync();
  });

  describe('verify()', () => {
    it('should pass when alias pair already exists (allows renewal)', async () => {
      const { address, alias } = aliasesSqlFixtures[0];
      const msg = buildAliasMsg(alias);

      await expect(
        verify({ address, msg: JSON.stringify(msg) })
      ).resolves.toBeTruthy();
    });

    it('should reject when alias is already linked to another address', async () => {
      const alias = aliasesSqlFixtures[0].alias;
      const differentAddress = '0x0000000000000000000000000000000000000099';
      const msg = buildAliasMsg(alias);

      await expect(
        verify({ address: differentAddress, msg: JSON.stringify(msg) })
      ).rejects.toMatch('alias is already linked to another address');
    });

    it('should pass when alias does not exist', async () => {
      const address = '0x0000000000000000000000000000000000000001';
      const msg = buildAliasMsg('0x0000000000000000000000000000000000000002');

      await expect(
        verify({ address, msg: JSON.stringify(msg) })
      ).resolves.toBeTruthy();
    });
  });

  describe('action()', () => {
    it('should bump created date when re-submitting existing alias', async () => {
      const { address, alias } = aliasesSqlFixtures[0];
      const newTimestamp = Math.floor(Date.now() / 1000) + 1000;
      const msg = buildAliasMsg(alias, newTimestamp);

      await action(
        { address, msg: JSON.stringify(msg) },
        'ipfs-new',
        '',
        'new-id'
      );

      const [row] = await db.queryAsync(
        'SELECT created FROM aliases WHERE address = ? AND alias = ?',
        [address, alias]
      );
      expect(row.created).toBe(newTimestamp);
    });
  });

  describe('isExistingAlias()', () => {
    it('should return true for valid alias', () => {
      expect(
        isExistingAlias(
          aliasesSqlFixtures[0].address,
          aliasesSqlFixtures[0].alias
        )
      ).resolves.toBe(true);
    });

    it('should return false for un-existing alias', () => {
      expect(
        isExistingAlias(aliasesSqlFixtures[0].address, 'invalid-alias')
      ).resolves.toBe(false);
    });

    it('should return false for expired alias', () => {
      expect(
        isExistingAlias(
          aliasesSqlFixtures[2].address,
          aliasesSqlFixtures[2].alias
        )
      ).resolves.toBe(false);
    });
  });
});
