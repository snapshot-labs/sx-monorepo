import db from './mysql';
import { POINTS_START_TIMESTAMP } from '../constants';

type LedgerEntry = {
  user: string;
  source: string;
  ref: string;
  amount: number;
  created: number;
};

// Records a points award and refreshes the user's total.
// INSERT IGNORE keeps the first assignment: points never change once given,
// so retries and duplicate calls are safe. The total is recomputed from the
// ledger, making it idempotent
export async function addPoints(entry: LedgerEntry) {
  if (entry.created < POINTS_START_TIMESTAMP) return;

  const query = `
    INSERT IGNORE INTO points_ledger (user, source, ref, amount, created)
    VALUES (?, ?, ?, ?, ?);
    INSERT INTO points (user, total)
    SELECT user, SUM(amount)
    FROM points_ledger
    WHERE user = ?
    GROUP BY user
    ON DUPLICATE KEY UPDATE total = VALUES(total);
  `;

  await db.queryAsync(query, [
    entry.user,
    entry.source,
    entry.ref,
    entry.amount,
    entry.created,
    entry.user
  ]);
}
