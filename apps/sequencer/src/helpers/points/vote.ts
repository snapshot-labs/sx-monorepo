import { CB, POINTS_START_TIMESTAMP } from '../../constants';
import log from '../log';
import db from '../mysql';

const SOURCE = 'vote';
const BATCH_SIZE = 25;

const UPDATE_TOTALS_QUERY = `
  INSERT INTO points (user, total)
  SELECT user, SUM(amount)
  FROM points_ledger
  WHERE user IN (
    SELECT voter
    FROM votes
    WHERE proposal IN (?)
  )
  GROUP BY user
  ON DUPLICATE KEY UPDATE total = VALUES(total)`;

// Batch whose award failed: the ledger insert may have committed without the
// totals update, so totals are repaired before any new work
let repairBatch: string[] | null = null;

// Finalized proposals with settled votes and no ledger row yet.
// Points are awarded once, after finalization, and are immutable.
async function getPendingProposals(): Promise<string[]> {
  // The votes NOT EXISTS defers proposals with votes not yet in a terminal cb
  // state (vp_value still being computed, or pending deletion)
  const query = `
    SELECT p.id
    FROM proposals p
    WHERE p.start >= ?
      AND p.votes > 0
      AND p.scores_state = 'final'
      AND NOT EXISTS (
        SELECT 1
        FROM points_ledger x
        WHERE x.source = ? AND x.ref = p.id
      )
      AND NOT EXISTS (
        SELECT 1
        FROM votes v
        WHERE v.proposal = p.id AND v.cb NOT IN (?)
      )
    LIMIT ?`;
  const results = await db.queryAsync(query, [
    POINTS_START_TIMESTAMP,
    SOURCE,
    [CB.FINAL, CB.INELIGIBLE],
    BATCH_SIZE
  ]);

  return results.map((r: any) => r.id);
}

async function processProposals(ids: string[]) {
  // INSERT IGNORE keeps the first assignment: points never change once given.
  // Ineligible votes get a 0-amount row, marking the proposal as processed.
  // The EXISTS guard skips proposals archived since selection
  const query = `
    INSERT IGNORE INTO points_ledger (user, source, ref, amount, created)
    SELECT v.voter, ?, v.proposal, IF(v.cb = ?, v.vp_value, 0), v.created
    FROM votes v
    WHERE v.proposal IN (?)
      AND EXISTS (
        SELECT 1
        FROM proposals p
        WHERE p.id = v.proposal
      );
    ${UPDATE_TOTALS_QUERY};
  `;
  await db.queryAsync(query, [SOURCE, CB.FINAL, ids, ids]);
}

// Repair only: recomputing totals from the ledger is idempotent
async function updateTotals(ids: string[]) {
  await db.queryAsync(UPDATE_TOTALS_QUERY, [ids]);
}

// Runs one award cycle, returns true when more work is likely pending
export default async function main(): Promise<boolean> {
  if (repairBatch) {
    await updateTotals(repairBatch);
    repairBatch = null;
  }

  const proposals = await getPendingProposals();

  if (proposals.length) {
    log.info(`[points] ${proposals.length} proposals to process`);
    repairBatch = proposals;
    await processProposals(proposals);
    repairBatch = null;
  }

  return proposals.length === BATCH_SIZE;
}
