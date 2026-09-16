import db from '../../src/helpers/mysql';

/**
 * The eligibility public key the e2e fixtures publish and freeze into proposals.
 *
 * A fixed value rather than one derived from `TE_ELIGIBILITY_PRIVATE_KEY`: the
 * tests that use it only need the frozen key and the in-use key to *agree*, and
 * deriving it would couple every suite to the sequencer's key material.
 */
export const ELIGIBILITY_KEY = `0x${'ab'.repeat(48)}`;

/**
 * Publish the eligibility key, as the sequencer would, and return it.
 *
 * `eligibilityPublicKey()` reads this row from the database, so **any suite that
 * calls it must call this first**. It used to be seeded by exactly one suite
 * (`geg-ballots-materialization`), which left every other suite that needed it
 * passing or failing on jest's suite order: run one of them first against a fresh
 * database and all of its tests fail with "the sequencer has not published an
 * eligibility key", which reads like a routing or config fault rather than a
 * missing fixture.
 *
 * Idempotent, so suites can call it independently and in any order.
 */
export async function seedEligibilityKey(): Promise<string> {
  await (db as any).queryAsync(
    `INSERT INTO te_eligibility_key (id, public_key, updated) VALUES (1, ?, ?)
       ON DUPLICATE KEY UPDATE public_key = VALUES(public_key)`,
    [ELIGIBILITY_KEY, 1]
  );
  return ELIGIBILITY_KEY;
}
