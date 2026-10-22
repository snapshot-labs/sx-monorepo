/**
 * Copies published tallies into the scores of closed private (`shutter-elgamal`)
 * proposals.
 *
 * Scores are normally recomputed when a vote arrives, but a closed proposal gets
 * no more votes. The keyper committee computes the tally and the coordinator
 * publishes it to the hub; every few seconds this loop finds closed private
 * proposals that have a result but no final scores, and calls the idempotent
 * `updateProposalAndVotes`.
 */
import log from './log';
import db from './mysql';
import { updateProposalAndVotes } from '../scores';

const POLL_INTERVAL_MS = Number(process.env.TE_TALLY_POLL_MS || 5000);

const inFlight = new Set<string>();

/**
 * The proposals this loop acts on. Exported so tests check this exact query; a
 * public proposal must never be selected.
 *
 * Stalled tallies are skipped until an admin clears the flag.
 */
export function selectTallyCandidates(ts: number): Promise<{ id: string }[]> {
  return db.queryAsync(
    `SELECT id FROM proposals
        WHERE privacy = 'shutter-elgamal'
          AND scores_state != 'final'
          AND end < ?
          AND te_mpk IS NOT NULL
          AND te_tally_stalled = 0
          AND EXISTS (SELECT 1 FROM te_results r WHERE r.proposal_id = proposals.id)
        ORDER BY end ASC
        LIMIT 25`,
    [ts]
  );
}

async function tick(): Promise<void> {
  let proposals: { id: string }[];
  try {
    const ts = Math.floor(Date.now() / 1e3);
    proposals = await selectTallyCandidates(ts);
  } catch (err: any) {
    log.warn(`[te-scheduler] query failed: ${err.message}`);
    return;
  }

  for (const { id } of proposals) {
    if (inFlight.has(id)) continue;
    inFlight.add(id);
    try {
      const finalised = await updateProposalAndVotes(id);
      if (finalised) log.info(`[te-scheduler] finalised tally for ${id}`);
    } catch (err: any) {
      log.warn(`[te-scheduler] ${id} failed: ${err.message}`);
    } finally {
      inFlight.delete(id);
    }
  }
}

export function startTeTallyScheduler(): void {
  log.info(`[te-scheduler] started (every ${POLL_INTERVAL_MS}ms)`);
  setTimeout(() => {
    tick();
  }, 3000);
  setInterval(() => {
    tick();
  }, POLL_INTERVAL_MS);
}
