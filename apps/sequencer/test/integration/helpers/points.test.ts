import db, { sequencerDB } from '../../../src/helpers/mysql';
import { addPoints } from '../../../src/helpers/points';

const USER_1 = '0x1111111111111111111111111111111111111111';
const USER_2 = '0x2222222222222222222222222222222222222222';

const buildEntry = (overrides = {}) => ({
  user: USER_1,
  action: 'proposal/vote',
  ref: '0xref-1',
  amount: 5,
  ...overrides
});

const cleanup = () =>
  db.queryAsync('DELETE FROM points_ledger; DELETE FROM points;');

async function getLedger() {
  return db.queryAsync(
    'SELECT * FROM points_ledger ORDER BY user, action, ref'
  );
}

async function getTotals(): Promise<Record<string, number>> {
  const rows = await db.queryAsync('SELECT user, total FROM points');

  return Object.fromEntries(rows.map((r: any) => [r.user, Number(r.total)]));
}

describe('helpers/points', () => {
  beforeEach(async () => {
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await db.endAsync();
    await sequencerDB.endAsync();
  });

  describe('addPoints()', () => {
    it('awards a single entry', async () => {
      const before = Math.floor(Date.now() / 1000);
      await addPoints([buildEntry()]);

      const ledger = await getLedger();
      expect(ledger).toHaveLength(1);
      expect(ledger[0].user).toBe(USER_1);
      expect(ledger[0].action).toBe('proposal/vote');
      expect(ledger[0].ref).toBe('0xref-1');
      expect(Number(ledger[0].amount)).toBe(5);
      expect(ledger[0].created).toBeGreaterThanOrEqual(before);
      expect(ledger[0].created).toBeLessThanOrEqual(
        Math.floor(Date.now() / 1000)
      );
      expect(await getTotals()).toEqual({ [USER_1]: 5 });
    });

    it('awards a batch across users and refs', async () => {
      await addPoints([
        buildEntry(),
        buildEntry({ ref: '0xref-2', amount: 2.5 }),
        buildEntry({ user: USER_2, amount: 3 })
      ]);

      expect(await getLedger()).toHaveLength(3);
      expect(await getTotals()).toEqual({ [USER_1]: 7.5, [USER_2]: 3 });
    });

    it('keeps the first award for the same user, action and ref', async () => {
      await addPoints([buildEntry()]);
      await addPoints([buildEntry({ amount: 9 })]);

      const ledger = await getLedger();
      expect(ledger).toHaveLength(1);
      expect(Number(ledger[0].amount)).toBe(5);
      expect(await getTotals()).toEqual({ [USER_1]: 5 });
    });

    it('is idempotent when the same batch is retried', async () => {
      const batch = [buildEntry(), buildEntry({ user: USER_2, amount: 3 })];

      await addPoints(batch);
      await addPoints(batch);

      expect(await getLedger()).toHaveLength(2);
      expect(await getTotals()).toEqual({ [USER_1]: 5, [USER_2]: 3 });
    });

    it('does nothing on an empty batch', async () => {
      await expect(addPoints([])).resolves.toBeUndefined();

      expect(await getLedger()).toHaveLength(0);
      expect(await getTotals()).toEqual({});
    });

    it('recomputes totals from the whole ledger, not just the batch', async () => {
      await db.queryAsync('INSERT INTO points_ledger SET ?', {
        user: USER_1,
        action: 'space/create',
        ref: '0xspace-1',
        amount: 4,
        created: Math.floor(Date.now() / 1000)
      });

      await addPoints([buildEntry()]);

      expect(await getTotals()).toEqual({ [USER_1]: 9 });
    });
  });
});
