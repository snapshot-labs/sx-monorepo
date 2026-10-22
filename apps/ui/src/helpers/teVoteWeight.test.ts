import { describe, expect, it } from 'vitest';
import { scaleWeight, teVoteWeight, totalVotingPower } from './teVoteWeight';

describe('scaleWeight', () => {
  it('rounds half *up*, matching the committee exactly', () => {
    // Python's `round` rounds half to even, so this must match the integer
    // `(w + s//2) // s`. SGP tests the same cases in test_aggregation.py.
    expect(scaleWeight(1, 2)).toBe(1);
    expect(scaleWeight(3, 2)).toBe(2);
    expect(scaleWeight(5, 2)).toBe(3);
    expect(scaleWeight(2, 4)).toBe(1);
    expect(scaleWeight(1, 4)).toBe(0);
  });
});

describe('teVoteWeight', () => {
  // `dust` must match the sequencer's `isDustVotingPower`, which refuses the vote
  // at ingest. A `zero-scaled` ballot is not refused: it is recorded with weight
  // zero. An absent or nonsensical scale means no scaling.
  it.each([
    // Large holdings are counted in full, with no cap.
    [25_000, undefined, { kind: 'ok', counted: 25_000, scale: 1 }],
    [2_000_000, undefined, { kind: 'ok', counted: 2_000_000, scale: 1 }],
    // Rounded to whole units.
    [3.4, undefined, { kind: 'ok', counted: 3, scale: 1 }],
    [3.6, undefined, { kind: 'ok', counted: 4, scale: 1 }],
    [0.5, undefined, { kind: 'ok', counted: 1, scale: 1 }],
    [0, undefined, { kind: 'dust', counted: 0, scale: 1 }],
    [0.4, undefined, { kind: 'dust', counted: 0, scale: 1 }],
    [Number.NaN, undefined, { kind: 'dust', counted: 0, scale: 1 }],
    [4096, 1024, { kind: 'scaled', counted: 4, scale: 1024 }],
    [100, 1024, { kind: 'zero-scaled', counted: 0, scale: 1024 }],
    [0.2, 1024, { kind: 'dust', counted: 0, scale: 1024 }],
    [500, 0, { kind: 'ok', counted: 500, scale: 1 }],
    [500, Number.NaN, { kind: 'ok', counted: 500, scale: 1 }]
  ])('counts vp %s at scale %s as %j', (vp, scale, expected) => {
    expect(teVoteWeight(vp, scale)).toEqual(expected);
  });
});

describe('totalVotingPower', () => {
  it('sums strategies and applies each ones decimals, or is null with none', () => {
    expect(
      totalVotingPower({
        votingPowers: [
          { value: 1_500_000_000_000_000_000_000n, cumulativeDecimals: 18 },
          { value: 500_000_000n, cumulativeDecimals: 6 }
        ]
      })
    ).toBe(2000);
    expect(totalVotingPower(undefined)).toBeNull();
    expect(totalVotingPower({ votingPowers: [] })).toBeNull();
  });
});
