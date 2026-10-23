/**
 * The eligibility public key currently in use, written to the database by the
 * sequencer at boot.
 *
 * The hub uses it to refuse proposals whose frozen key no longer matches, since a
 * rotated key would otherwise produce an all-zeros tally that looks valid.
 *
 * Not cached: the hub can outlive a sequencer restart that rotates the key, and
 * this is a cheap single-row lookup.
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
