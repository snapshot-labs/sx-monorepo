import { doesMessageExist, storeMsg } from '../../../src/helpers/highlight';
import db, { sequencerDB } from '../../../src/helpers/mysql';

describe('highlight', () => {
  afterEach(async () => {
    await db.queryAsync(
      'DELETE from snapshot_sequencer_test.messages where id = ?',
      'test-exists'
    );
  });

  beforeAll(async () => {
    await db.queryAsync(
      'DELETE from snapshot_sequencer_test.messages where id = ?',
      'test-exists'
    );
  });

  afterAll(async () => {
    await db.endAsync();
    await sequencerDB.endAsync();
  });

  describe('doesMessageExist()', () => {
    it('returns false when message does not exist yet', async () => {
      expect(await doesMessageExist('test-not-exists')).toEqual(false);
    });

    it('returns true when message already exist', async () => {
      await storeMsg('test-exists', '', '', '', 0, '', '', '', '');
      expect(await doesMessageExist('test-exists')).toEqual(true);
    });
  });

  describe('storeMsg', () => {
    it('triggers a duplicate entry error on duplicate', async () => {
      await storeMsg('test-exists', '', '', '', 0, '', '', '', '');

      await expect(
        storeMsg('test-exists', '', '', '', 0, '', '', '', '')
      ).rejects.toThrow(/ER_DUP_ENTRY/);
    });
  });
});
