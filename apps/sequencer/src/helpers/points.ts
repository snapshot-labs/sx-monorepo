import db from './mysql';

export type LedgerEntry = {
  user: string;
  action: string;
  ref: string;
  amount: number;
};

// The no-op ON DUPLICATE KEY UPDATE keeps the first assignment: points never
// change once given, so duplicate calls are safe while other errors still
// surface; the totals recompute is idempotent
export async function addPoints(entries: LedgerEntry[]) {
  if (!entries.length) return;

  const created = Math.floor(Date.now() / 1000);
  const query = `
    INSERT INTO points_ledger (user, action, ref, amount, created)
    VALUES ?
    ON DUPLICATE KEY UPDATE user = user;
    INSERT INTO points (user, total)
    SELECT user, SUM(amount)
    FROM points_ledger
    WHERE user IN (?)
    GROUP BY user
    ON DUPLICATE KEY UPDATE total = VALUES(total);
  `;

  await db.queryAsync(query, [
    entries.map(e => [e.user, e.action, e.ref, e.amount, created]),
    entries.map(e => e.user)
  ]);
}
