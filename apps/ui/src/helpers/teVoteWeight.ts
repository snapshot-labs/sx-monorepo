/**
 * What a private proposal will actually count this voter as, decided before they
 * sign rather than after.
 *
 * Voting power on a `shutter-elgamal` proposal is used **as held** — the per-voter
 * cap this file used to describe is gone. What remains are two ways the counted
 * figure can still differ from the held one, and both are worth seeing in advance:
 *
 *   - **The floor.** The protocol counts in whole numbers, so a holder of 0.3
 *     rounds to zero weight and the sequencer refuses the vote outright. This is
 *     the only one of the two zero cases that is a refusal -- see below.
 *   - **The scale.** When a space's total supply is large enough that the tally
 *     would exceed what the committee's coordinator can compute, the proposal counts
 *     in units of `scale` instead of single tokens. Every ratio in the cap table
 *     survives — it divides everyone, unlike the cap it replaced, which flattened the
 *     top — but a holder below `scale/2` rounds to zero and moves nothing.
 *
 * `scale` is 1 for essentially every real space, in which case none of this fires
 * and a voter sees nothing.
 *
 * **The two zero cases are not the same, and only one is a refusal.**
 *
 *   - `dust` — raw voting power below 0.5. The sequencer *does* refuse this, at
 *     credential issuance (`isDustVotingPower`, which tests the **raw** vp), so the
 *     voter genuinely cannot vote.
 *   - `zero-scaled` — raw voting power of 1 or more that rounds to zero at `scale`.
 *     The sequencer does **not** refuse this. The credential is issued, the ballot
 *     is signed and recorded, and the committee aggregates it with weight zero.
 *
 * Refusing the second would disenfranchise a real holder over an operator's ceiling
 * setting, and unlike true dust it is always recoverable by raising
 * `TE_SOLVER_CEILING`. Recording the ballot also keeps the admitted set honest: the
 * voter took part, and the aggregate says so.
 *
 * **This is advisory only.** The sequencer decides, and the committee applies the
 * scale at aggregation. This exists so the outcome is not a surprise — telling a
 * `zero-scaled` voter *before* they sign is the whole point, since nothing
 * downstream will tell them afterwards.
 */

/**
 * Integer half-up, matching the committee's `(w + s//2) // s` exactly.
 *
 * Not `Math.round(w / s)`: that is half-up in JavaScript but half-to-even in Python,
 * so the two would disagree at exactly `.5` and produce different aggregates from
 * identical ballots. Integer arithmetic has no such split.
 */
export function scaleWeight(weight: number, scale: number): number {
  if (scale <= 1) return weight;
  return Math.floor((weight + Math.floor(scale / 2)) / scale);
}

export type TeVoteWeight =
  /** Counted at full weight, in whole tokens. */
  | { kind: 'ok'; counted: number; scale: number }
  /** Counted, but in units of `scale` — `counted` is already in those units. */
  | { kind: 'scaled'; counted: number; scale: number }
  /** Rounds to zero weight, so the sequencer will refuse the vote outright. */
  | { kind: 'dust'; counted: 0; scale: number }
  /**
   * Admitted but worth nothing: raw vp >= 1, yet below `scale/2`. Only possible when
   * `scale > 1`. **Not refused** — the ballot is issued, signed and recorded, and
   * aggregated with weight zero. Distinct from `dust`, which the sequencer rejects.
   */
  | { kind: 'zero-scaled'; counted: 0; scale: number };

/**
 * The `dust` branch must stay identical to `isDustVotingPower` in the sequencer,
 * and the scaling to `teVerify`. A disagreement shows the voter a figure the tally
 * will not honour, which is worse than showing nothing.
 *
 * Note which value each branch tests. `dust` is decided on the **raw** vp, exactly
 * as the sequencer does; `zero-scaled` is decided on the **scaled** weight and has
 * no sequencer counterpart, because nothing there refuses it. Reading the
 * sequencer's "voting power too low" message as covering both is the easy mistake.
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

/** The same figure `getFormattedVotingPower` renders, as a plain number. */
export function totalVotingPower(votingPower?: {
  votingPowers: { value: bigint; cumulativeDecimals: number }[];
}): number | null {
  if (!votingPower?.votingPowers?.length) return null;
  return votingPower.votingPowers.reduce(
    (acc, b) => acc + Number(b.value) / 10 ** b.cumulativeDecimals,
    0
  );
}
