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
 *
 * The key is frozen when the proposal is created and never changes. After a
 * rotation, every proposal created before it, started or not, refuses credentials
 * and votes; only proposals created after it use the new key.
 */

import { eligibilityPublicKey } from './sgpAttestation';
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
