/**
 * The eligibility public key, frozen onto each private proposal.
 *
 * The sequencer signs ballot credentials with `TE_ELIGIBILITY_PRIVATE_KEY`, and
 * keypers check them against the public key frozen on the proposal. If the two
 * differ, every ballot is dropped and the tally is all zeros, so the public key
 * is always derived from that one private key.
 *
 * A missing or malformed key rejects the proposal, since its tally could never
 * complete.
 */

import log from './log';
import db from './mysql';
import { eligibilityPublicKey, SgpAttestationError } from './sgpAttestation';
import { parseCommitteeSnapshotLoose } from './teCommittee';

export const KEY_ROTATED_MESSAGE =
  "this proposal's eligibility key was rotated; it can no longer accept votes";

/**
 * True when the key in use differs from the one frozen on the proposal. Its
 * credentials would no longer verify against the frozen key, so the proposal
 * accepts no more votes; ballots already cast still count in the tally.
 */
export async function isEligibilityKeyRotated(proposal: {
  te_sgp_config: unknown;
}): Promise<boolean> {
  const frozen = parseCommitteeSnapshotLoose(
    proposal.te_sgp_config
  )?.eligibilityKey;
  if (typeof frozen !== 'string') return false;
  return frozen.toLowerCase() !== (await eligibilityPublicKey()).toLowerCase();
}

/**
 * Moves every proposal with a committee that has not started yet to the key in
 * use. The key is read once per process, so a rotation always comes with a restart,
 * and running this at boot covers every rotation. The protocol lets the election
 * config change until voting starts, and before then no ballot exists. A proposal
 * that has started keeps its frozen key. Returns the number of proposals moved.
 */
export async function refreezeEligibilityKey(
  now = Math.floor(Date.now() / 1e3)
): Promise<number> {
  let key: string;
  try {
    key = (await eligibilityPublicKey()).toLowerCase();
  } catch (err: any) {
    if (err instanceof SgpAttestationError) {
      log.warn(`[te] eligibility key not refrozen: ${err.message}`);
      return 0;
    }
    throw err;
  }

  // Runs at startup, so a failure is logged, not thrown: it must not keep the
  // sequencer, and public voting with it, from starting (for example on a hub
  // database the private-voting migration has not reached yet). A proposal it
  // could not move only refuses votes, with a clear message.
  let result: any;
  try {
    result = await db.queryAsync(
      `UPDATE proposals
          SET te_sgp_config = JSON_SET(te_sgp_config, '$.eligibilityKey', ?)
        WHERE te_sgp_config IS NOT NULL
          AND start > ?
          AND JSON_UNQUOTE(JSON_EXTRACT(te_sgp_config, '$.eligibilityKey')) <> ?`,
      [key, now, key]
    );
  } catch (err: any) {
    log.error(`[te] eligibility key not refrozen: ${err?.message || err}`);
    return 0;
  }
  const moved = Number(result?.affectedRows ?? 0);
  if (moved > 0) {
    log.info(
      `[te] moved ${moved} ${moved === 1 ? 'proposal' : 'proposals'} that had not started to the eligibility key in use`
    );
  }
  return moved;
}
