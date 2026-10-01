/**
 * The eligibility public key, for freezing onto a proposal.
 *
 * The sequencer holds the eligibility *private* key and mints one credential per
 * ballot at ingest, binding that ballot's voting-power weight. The keypers verify
 * those credentials against the public key frozen in the proposal's config — so
 * if the frozen key and the signing key ever disagree, every credential fails to
 * verify, every ballot is excluded from the tally, and the result is all zeros
 * with nothing in the logs to explain it.
 *
 * The defence is exactly one source of truth. That used to mean fetching the key
 * from the hub, which held it; now the signer is here, so the key is derived
 * locally from `TE_ELIGIBILITY_PRIVATE_KEY` and the direction reverses — the hub
 * fetches it from us, for its rotation guard. There is still one private key and
 * one authority for the public half.
 *
 * A missing or malformed key rejects the proposal. That is deliberate: a private
 * proposal created with no eligibility key is one whose tally can never complete,
 * and refusing it up front is strictly kinder than discovering it after voting.
 */

import { eligibilityPublicKey, GegAttestationError } from './gegAttestation';
import log from './log';
import db from './mysql';

export class TeEligibilityError extends Error {}

/**
 * Test seam. The issuer itself is memoised in `gegAttestation`; this re-exports
 * its reset so callers that used to clear an HTTP cache keep working.
 */
export { resetIssuer as resetEligibilityKeyCache } from './gegAttestation';

export async function getEligibilityKey(): Promise<string> {
  try {
    return await eligibilityPublicKey();
  } catch (err: any) {
    if (err instanceof GegAttestationError) {
      throw new TeEligibilityError(err.message);
    }
    throw err;
  }
}

/**
 * Publish the public half so the hub can run its rotation guard.
 *
 * The hub needs to know the key currently in use, to refuse serving a proposal
 * whose frozen key no longer matches it. Both services already share this database, so
 * the key goes through it.
 *
 * Called once at boot, and that is sufficient: the key comes from an environment
 * variable read at startup, so changing it requires a restart, so this row
 * cannot describe a key the process is no longer signing with.
 *
 * A missing key is not fatal here. Public voting must keep working; the private
 * path fails loudly on its own, when a vote is cast or a proposal created.
 */
export async function publishEligibilityKey(): Promise<void> {
  let publicKey: string;
  try {
    publicKey = await eligibilityPublicKey();
  } catch (err: any) {
    if (err instanceof GegAttestationError) {
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
