import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { scaleWeight } from './teVoteWeight';

/**
 * Weight scaling, pinned to the bytes geg pins against.
 *
 * `packages/geg-parity/vectors/scale/scaled_weight_boundary.json` is authored in geg
 * and replayed there by `tests/test_conformance_vectors.py::test_scaled_weight_vector`.
 * Driving the identical file from this side is the whole point: comparing each
 * implementation to its own arithmetic would pass even if the two disagreed.
 *
 * What it guards is narrow and easy to reintroduce. Python's `round` is
 * half-to-even, JavaScript's `Math.round` is half-up, so `Math.round(w / s)` agrees
 * with geg everywhere *except* at exactly `.5` — and there it makes the committee and
 * the browser build different aggregates from identical ballots. That surfaces as an
 * honest committee appearing to have published a false aggregate, with nothing in the
 * error pointing at rounding.
 */

interface ScaleCase {
  weight: number;
  scale: number;
  scaled: number;
}

const vector: { cases: ScaleCase[] } = JSON.parse(
  readFileSync(
    join(
      __dirname,
      '../../../../packages/geg-parity/vectors/scale/scaled_weight_boundary.json'
    ),
    'utf8'
  )
);

describe('scaleWeight — geg parity vector', () => {
  it('has cases to check', () => {
    expect(vector.cases.length).toBeGreaterThan(0);
  });

  it.each(vector.cases)(
    'weight $weight at scale $scale counts as $scaled',
    ({ weight, scale, scaled }) => {
      expect(scaleWeight(weight, scale)).toBe(scaled);
    }
  );

  // Note the asymmetry, because it is easy to get backwards: `Math.round` is
  // *already* half-up, so a float implementation on this side agrees with the vector.
  // The divergence risk lives on the Python side, where `round` is half-to-even —
  // geg's own test asserts that a float implementation there fails these cases. What
  // this side has to guard instead is precision: `w / s` is a float division, and at
  // weights past 2^53 it stops being exact.
  it('stays exact at weights past 2^53, where float division does not', () => {
    const w = 9_007_199_254_740_993; // 2^53 + 1
    expect(scaleWeight(w, 2)).toBe(Math.floor((w + 1) / 2));
    expect(Number.isSafeInteger(scaleWeight(w, 2))).toBe(true);
  });
});
