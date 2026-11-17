import db, { sequencerDB } from '../src/helpers/mysql';

const setup = async () => {
  try {
    await db.queryAsync('SELECT 1 + 1');
    await sequencerDB.queryAsync('SELECT 1 + 1');
    // Snapshot Plus fees in gwei, as in production. A missing fee reads as 0,
    // which would make every space Plus
    await db.queryAsync(
      'INSERT INTO options (name, value) VALUES ? ON DUPLICATE KEY UPDATE value = VALUES(value)',
      [
        [
          ['space.plus.proposal_fee', '8000000'],
          ['space.plus.vote_fee', '160000']
        ]
      ]
    );
  } catch (err: any) {
    if (err.code === 'ER_BAD_DB_ERROR') {
      console.error('Test database not setup, please run `bun run test:setup`');
      throw new Error('Test database not setup');
    }
  } finally {
    await db.endAsync();
    await sequencerDB.endAsync();
  }
};

export default setup;
