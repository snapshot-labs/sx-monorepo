/**
 * The eligibility public key currently in use, read from the database.
 *
 * The hub used to hold the eligibility *private* key and mint one credential per
 * ballot on the read path. That moved to the sequencer — the component that
 * computes voting power, and so the one that should sign a claim about it — which
 * also took ~2ms of BLS per ballot off an unauthenticated public GET.
 *
 * What the hub still needs is the *public* half, for exactly one job: refusing to
 * serve a proposal whose frozen key no longer matches the key in use. That check
 * is the only thing standing between a rotated key and a legitimate-looking
 * all-zeros tally, so how the hub learns the key matters.
 *
 * It comes through the database, written by the sequencer at boot.
 *
 * **Deliberately not cached.** An earlier version memoised this for the process
 * lifetime, which was wrong: the hub outlives a sequencer restart, so after a
 * rotation it would keep comparing the old key against the old frozen key,
 * quietly pass, and reintroduce the failure above. This is a single-row primary
 * key lookup once per request, which is not worth a staleness window on a
 * security check.
 */

import db from './mysql';

export class EligibilityKeyError extends Error {}

const KEY_RE = /^0x[0-9a-f]{96}$/;

export async function eligibilityPublicKey(): Promise<string> {
  const rows = await (db as any).queryAsync(
    'SELECT public_key FROM te_eligibility_key WHERE id = 1 LIMIT 1'
  );
  const key = String(rows[0]?.public_key ?? '').toLowerCase();

  if (!key) {
    throw new EligibilityKeyError(
      'the sequencer has not published an eligibility key; it is either not ' +
        'configured with TE_ELIGIBILITY_PRIVATE_KEY or has not started yet'
    );
  }
  if (!KEY_RE.test(key)) {
    throw new EligibilityKeyError(
      `the published eligibility key is malformed: ${key}`
    );
  }
  return key;
}
