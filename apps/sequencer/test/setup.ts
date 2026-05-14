import db, { sequencerDB } from '../src/helpers/mysql';

const setup = async () => {
  try {
    await db.queryAsync('SELECT 1 + 1');
    await sequencerDB.queryAsync('SELECT 1 + 1');
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
