/**
 * The replacement tally must compute what the deleted one computed.
 *
 * The pre-geg sequencer summed ballots itself; the committee does it now, and the
 * verify panel recomputes it a third time for the audit surface. The plan's Phase 4
 * exit gate asked for the legacy outputs to be captured before deletion as a
 * permanent regression guard. They were not, so the corpus was reconstructed from
 * `master:apps/sequencer/src/helpers/te.ts` — see
 * `scripts/geg/gen-legacy-equivalence.ts`.
 *
 * The corpus was built while current behaviour clamped at `maxWeight` and legacy did
 * not, so the whale case recorded *both* answers rather than asserting one. Removing
 * the clamp (W1) collapsed that divergence: an unscaled election now reproduces
 * legacy exactly, whale included, which is a stronger guarantee than the corpus was
 * originally able to claim. The whale assertions below are inverted accordingly.
 *
 * `maxWeight` in the corpus is now read as a scale of 1 — no scaling — since that is
 * the configuration under which the two agree.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { aggregateBallots } from './teVerify';

type Agg = {
  election_id: string;
  num_candidates: number;
  ciphertexts: { c1: string; c2: string }[];
};

const corpus = JSON.parse(
  readFileSync(
    join(
      __dirname,
      '../../../../packages/geg-parity/vectors/legacy-equivalence.json'
    ),
    'utf8'
  )
) as {
  proposalId: string;
  numCandidates: number;
  maxWeight: number;
  equivalent: { ballots: any[]; aggregate: Agg };
  divergent: { ballots: any[]; legacyAggregate: Agg; currentAggregate: Agg };
  boundary: {
    totalAdmittedWeight: string;
    asJsNumber: number;
    exactRoundTrip: string;
  };
};

function payload(ballots: any[], maxWeight: number | null) {
  return {
    te_mpk: `0x${'00'.repeat(96)}`,
    te_config: {
      numCandidates: corpus.numCandidates,
      budget: 100,
      mode: 'exact',
      variant: 'A'
    },
    maxWeight,
    ballots
  } as any;
}

describe('legacy equivalence', () => {
  beforeAll(() => {
    expect(corpus.equivalent.ballots.length).toBeGreaterThan(0);
  });

  // The actual guard: same ballots, same weights, same sum as the deleted code.
  it('reproduces the legacy aggregate where no weight was clamped', async () => {
    const result = await aggregateBallots(
      payload(corpus.equivalent.ballots, corpus.maxWeight),
      corpus.equivalent.aggregate as any
    );
    expect(result.aggregateMatches).toBe(true);
    expect(result.scaledToZero).toEqual([]);
  });

  // Rounding is part of what must not drift: 1.4 → 1 and 0.5 → 1 both count once,
  // so five ballots contribute even though two of them hold less than 2.
  it('counts every in-cap ballot, including the rounded ones', async () => {
    const result = await aggregateBallots(
      payload(corpus.equivalent.ballots, corpus.maxWeight),
      corpus.equivalent.aggregate as any
    );
    expect(result.contributing).toBe(corpus.equivalent.ballots.length);
  });

  // The documented divergence is **gone**, and that is the headline.
  //
  // This corpus was built when current behaviour clamped at `maxWeight` and legacy
  // did not, so the whale case recorded two different answers rather than asserting
  // one. Removing the clamp (W1) collapses that: an unscaled election now reproduces
  // legacy exactly, whale included. The assertion is inverted deliberately — it used
  // to prove the divergence *was* the cap, and now proves there is nothing else left
  // to diverge on.
  it('reproduces legacy on the whale too, now that nothing is clamped', async () => {
    const result = await aggregateBallots(
      payload(corpus.divergent.ballots, 1),
      corpus.divergent.legacyAggregate as any
    );
    expect(result.aggregateMatches).toBe(true);
    expect(result.scaledToZero).toEqual([]);
  });

  // And it must no longer reproduce the old clamped answer, or the clamp is somehow
  // still being applied somewhere.
  it('no longer reproduces the clamped aggregate', async () => {
    const result = await aggregateBallots(
      payload(corpus.divergent.ballots, 1),
      corpus.divergent.currentAggregate as any
    );
    expect(result.aggregateMatches).toBe(false);
  });

  // The float boundary the digest encoding exists for: past 2^53 a JS number is no
  // longer the value it was given, so a total admitted weight carried as a number
  // changes the digest and no quorum forms.
  it('records that a total past 2^53 is not exact as a number', () => {
    expect(String(corpus.boundary.asJsNumber)).not.toBe(
      corpus.boundary.exactRoundTrip
    );
    expect(BigInt(corpus.boundary.totalAdmittedWeight).toString()).toBe(
      corpus.boundary.exactRoundTrip
    );
  });
});
