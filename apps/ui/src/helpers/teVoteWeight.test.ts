import { describe, expect, it } from 'vitest';
import { scaleWeight, teVoteWeight, totalVotingPower } from './teVoteWeight';

/**
 * The per-voter cap this file used to pin is gone (W1): voting power is counted as
 * held. What is left to check is the floor, and the scale factor that replaced the
 * cap — which divides everyone rather than truncating some.
 */
describe('scaleWeight', () => {
  it('is the identity at scale 1 — the case essentially every space takes', () => {
    for (const w of [0, 1, 9_999, 25_000, 2_000_000]) {
      expect(scaleWeight(w, 1)).toBe(w);
    }
  });

  it('rounds half *up*, matching the committee exactly', () => {
    // The cross-language landmine: `Math.round` is half-up in JS, `round` is
    // half-to-even in Python. Integer `(w + s//2) // s` has no such split, and geg
    // pins the identical boundary in test_aggregation.py.
    expect(scaleWeight(1, 2)).toBe(1);
    expect(scaleWeight(3, 2)).toBe(2);
    expect(scaleWeight(5, 2)).toBe(3);
    expect(scaleWeight(2, 4)).toBe(1);
    expect(scaleWeight(1, 4)).toBe(0);
  });
});

describe('teVoteWeight', () => {
  it('counts voting power in full — no cap', () => {
    // The whole point of the change: a holder of 25,000 used to be counted as
    // 10,000 on a weighted proposal.
    expect(teVoteWeight(25_000)).toEqual({
      kind: 'ok',
      counted: 25_000,
      scale: 1
    });
    expect(teVoteWeight(2_000_000)).toEqual({
      kind: 'ok',
      counted: 2_000_000,
      scale: 1
    });
  });

  it('rounds to whole units', () => {
    expect(teVoteWeight(3.4).counted).toBe(3);
    expect(teVoteWeight(3.6).counted).toBe(4);
  });

  it('refuses dust, which the sequencer also refuses at ingest', () => {
    for (const vp of [0, 0.4, Number.NaN]) {
      expect(teVoteWeight(vp).kind).toBe('dust');
    }
    expect(teVoteWeight(0.5).kind).toBe('ok');
  });

  it('reports scaling when the proposal counts in larger units', () => {
    expect(teVoteWeight(4096, 1024)).toEqual({
      kind: 'scaled',
      counted: 4,
      scale: 1024
    });
  });

  it('distinguishes a zero-scaled ballot from dust', () => {
    // Different outcomes and different messages: dust is refused at ingest, while a
    // zero-scaled ballot is admitted and recorded but moves nothing.
    const r = teVoteWeight(100, 1024);
    expect(r.kind).toBe('zero-scaled');
    expect(r.counted).toBe(0);
    expect(teVoteWeight(0.2, 1024).kind).toBe('dust');
  });

  it('treats an absent or nonsensical scale as no scaling', () => {
    expect(teVoteWeight(500).scale).toBe(1);
    expect(teVoteWeight(500, 0).scale).toBe(1);
    expect(teVoteWeight(500, Number.NaN).scale).toBe(1);
  });
});

describe('totalVotingPower', () => {
  it('sums strategies and applies each ones decimals', () => {
    expect(
      totalVotingPower({
        votingPowers: [
          { value: 1_500_000_000_000_000_000_000n, cumulativeDecimals: 18 },
          { value: 500_000_000n, cumulativeDecimals: 6 }
        ]
      })
    ).toBe(2000);
  });

  it('returns null when there is nothing to sum', () => {
    expect(totalVotingPower(undefined)).toBeNull();
    expect(totalVotingPower({ votingPowers: [] })).toBeNull();
  });
});
