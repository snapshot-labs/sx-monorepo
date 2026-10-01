/**
 * Auto-tally scheduler for permanent-private (``shutter-elgamal``) proposals.
 *
 * The base sequencer only recomputes scores when a vote arrives or when
 * something explicitly hits ``GET /scores/:id``. For threshold-ElGamal
 * proposals the final tally can only run *after* the proposal closes, and a
 * closed proposal may receive no further votes — so without a scheduler the
 * result would never be finalised unless an operator manually poked the
 * endpoint.
 *
 * This loop periodically finds closed ``shutter-elgamal`` proposals whose
 * scores are not yet final and whose DKG has completed (``te_mpk`` present),
 * and calls ``updateProposalAndVotes``. That worker is idempotent: it
 * recomputes the homomorphic aggregate, nudges the keypers to publish their
 * decryption shares, and — once enough shares are in — recovers and persists
 * the final tally. Ticks that find shares still missing simply return and the
 * next tick retries.
 */
import log from './log';
import db from './mysql';
import { updateProposalAndVotes } from '../scores';

const POLL_INTERVAL_MS = Number(process.env.TE_TALLY_POLL_MS || 5000);

const inFlight = new Set<string>();

/**
 * Which proposals this loop will act on.
 *
 * Exported so the backward-compatibility test can assert against the *real*
 * predicate rather than a copy of it. `privacy = 'shutter-elgamal'` is the D14
 * gate: a public proposal must never be picked up here, and a test that
 * re-typed this SQL would keep passing if the gate were dropped.
 *
 * A stalled tally is one the committee could not complete; polling it every few
 * seconds produces noise, not progress. It re-enters the moment an admin clears
 * the flag.
 */
export function selectTallyCandidates(ts: number): Promise<{ id: string }[]> {
  return db.queryAsync(
    `SELECT id FROM proposals
        WHERE privacy = 'shutter-elgamal'
          AND scores_state != 'final'
          AND end < ?
          AND te_mpk IS NOT NULL
          AND te_tally_stalled = 0
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
