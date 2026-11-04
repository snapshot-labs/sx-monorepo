/**
 * Predicts how a private (`shutter-elgamal`) proposal will count this voter, so the
 * UI can warn them before they sign.
 *
 * Voting power is counted as held, with two exceptions:
 *
 *   - `dust`: voting power below 0.5 rounds to zero, because the protocol counts in
 *     whole numbers. The sequencer refuses to issue a credential
 *     (`isDustVotingPower`, which checks the raw voting power), so the user cannot
 *     vote.
 *   - `zero-scaled`: if the space's total supply is too large for the coordinator to
 *     tally, the proposal counts in units of `scale` instead of single tokens, which
 *     keeps every voter's share the same. A voter with less than `scale/2` rounds to
 *     zero. The sequencer does not refuse this: the ballot is recorded and counted
 *     with weight zero. An operator can avoid it by raising `TE_SOLVER_CEILING`.
 *
 * `scale` is 1 for almost every space, so neither the scaled case nor `zero-scaled`
 * happens.
 *
 * This is advisory only: the sequencer and the committee decide. Nothing tells a
 * `zero-scaled` voter afterwards, so the warning before signing matters.
 */

/**
 * Divides by `scale`, rounding half up. Must match the committee's
 * `(w + s//2) // s`. Integer maths is used because Python's `round` rounds half to
 * even, so `Math.round(w / s)` would disagree at exactly `.5`.
 */
export function scaleWeight(weight: number, scale: number): number {
  if (scale <= 1) return weight;
  return Math.floor((weight + Math.floor(scale / 2)) / scale);
}

export type TeVoteWeight =
  /** Counted at full weight, in whole tokens. */
  | { kind: 'ok'; counted: number; scale: number }
  /** Counted in units of `scale`; `counted` is already in those units. */
  | { kind: 'scaled'; counted: number; scale: number }
  /** Rounds to zero weight; the sequencer refuses the vote. */
  | { kind: 'dust'; counted: 0; scale: number }
  /**
   * Rounds to zero only after scaling (needs `scale > 1`). Not refused: the ballot
   * is recorded and counted with weight zero.
   */
  | { kind: 'zero-scaled'; counted: 0; scale: number };

/**
 * The `dust` check must match `isDustVotingPower` in the sequencer, and the scaling
 * must match `teVerify`, or the voter is shown a weight the tally will not use.
 * `dust` is decided on the raw voting power; `zero-scaled` on the scaled weight.
 */
export function teVoteWeight(vp: number, scale = 1): TeVoteWeight {
  const s = Number.isFinite(scale) && scale >= 1 ? Math.floor(scale) : 1;

  if (!Number.isFinite(vp) || Math.round(vp) < 1) {
    return { kind: 'dust', counted: 0, scale: s };
  }
  const rounded = Math.round(vp);
  const counted = scaleWeight(rounded, s);

  if (counted === 0) return { kind: 'zero-scaled', counted: 0, scale: s };
  return s === 1
    ? { kind: 'ok', counted, scale: s }
    : { kind: 'scaled', counted, scale: s };
}

/** The total that `getFormattedVotingPower` shows, as a plain number. */
export function totalVotingPower(votingPower?: {
  votingPowers: { value: bigint; cumulativeDecimals: number }[];
}): number | null {
  if (!votingPower?.votingPowers?.length) return null;
  return votingPower.votingPowers.reduce(
    (acc, b) => acc + Number(b.value) / 10 ** b.cumulativeDecimals,
    0
  );
}
