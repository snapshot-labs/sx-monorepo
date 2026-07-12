import db from './mysql';
import { POINTS_START_TIMESTAMP } from '../constants';

type LedgerEntry = {
  user: string;
  action: string;
  ref: string;
  amount: number;
  actionDate: number;
};

// Records points awards and refreshes the users' totals.
// INSERT IGNORE keeps the first assignment: points never change once given,
// so retries and duplicate calls are safe. Totals are recomputed from the
// ledger, making it idempotent
export async function addPoints(entries: LedgerEntry[]) {
  const eligible = entries.filter(e => e.actionDate >= POINTS_START_TIMESTAMP);
  if (!eligible.length) return;

  const query = `
    INSERT IGNORE INTO points_ledger (user, action, ref, amount, action_date)
    VALUES ?;
    INSERT INTO points (user, total)
    SELECT user, SUM(amount)
    FROM points_ledger
    WHERE user IN (?)
    GROUP BY user
    ON DUPLICATE KEY UPDATE total = VALUES(total);
  `;

  await db.queryAsync(query, [
    eligible.map(e => [e.user, e.action, e.ref, e.amount, e.actionDate]),
    [...new Set(eligible.map(e => e.user))]
  ]);
}
