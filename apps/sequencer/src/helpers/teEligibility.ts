/**
 * The eligibility public key, frozen onto each private proposal.
 *
 * The sequencer signs ballot credentials with `TE_ELIGIBILITY_PRIVATE_KEY`, and
 * keypers check them against the public key frozen on the proposal. If the two
 * differ, every ballot is dropped and the tally is all zeros, so the public key
 * is always derived from that one private key. The hub reads it from here.
 *
 * A missing or malformed key rejects the proposal, since its tally could never
 * complete.
 */

import log from './log';
import db from './mysql';
import { eligibilityPublicKey, SgpAttestationError } from './sgpAttestation';

export class TeEligibilityError extends Error {}

/** For tests: resets the cached issuer in `sgpAttestation`. */
export { resetIssuer as resetEligibilityKeyCache } from './sgpAttestation';

export async function getEligibilityKey(): Promise<string> {
  try {
    return await eligibilityPublicKey();
  } catch (err: any) {
    if (err instanceof SgpAttestationError) {
      throw new TeEligibilityError(err.message);
    }
    throw err;
  }
}

/**
 * Write the current public key to the shared database, so the hub can refuse to
 * serve a proposal whose frozen key no longer matches it.
 *
 * Called once at boot; the key comes from env, so changing it needs a restart.
 * A missing key only logs a warning, so public voting keeps working; private
 * votes and proposals fail on their own.
 */
export async function publishEligibilityKey(): Promise<void> {
  let publicKey: string;
  try {
    publicKey = await eligibilityPublicKey();
  } catch (err: any) {
    if (err instanceof SgpAttestationError) {
      log.warn(
        `[te] eligibility key not published: ${err.message}. Private voting is unavailable until it is configured.`
      );
      return;
    }
    throw err;
  }

  await db.queryAsync(
    `INSERT INTO te_eligibility_key (id, public_key, updated) VALUES (1, ?, ?)
       ON DUPLICATE KEY UPDATE public_key = VALUES(public_key), updated = VALUES(updated)`,
    [publicKey, Math.floor(Date.now() / 1e3)]
  );
  log.info(`[te] published eligibility key ${publicKey.slice(0, 12)}…`);
}
