/**
 * proofOfTime.test.ts — Unit tests for PoT voting strategy
 */

import {
  computeAccuracyMultiplier,
  computePoTHash,
  generateProofOfTime,
  ProofOfTime,
} from './proofOfTime';

describe('computeAccuracyMultiplier', () => {
  const toleranceMs = 500;
  const potTs = 1_700_000_000_000;

  it('returns 1.0 when deviation is zero', () => {
    expect(computeAccuracyMultiplier(potTs, potTs, toleranceMs)).toBe(1.0);
  });

  it('returns 1.0 when deviation equals tolerance exactly', () => {
    expect(computeAccuracyMultiplier(potTs + toleranceMs, potTs, toleranceMs)).toBe(1.0);
  });

  it('returns 0.5 when deviation is between 1x and 2x tolerance', () => {
    expect(computeAccuracyMultiplier(potTs + toleranceMs + 1, potTs, toleranceMs)).toBe(0.5);
    expect(computeAccuracyMultiplier(potTs + toleranceMs * 2, potTs, toleranceMs)).toBe(0.5);
  });

  it('returns 0.0 when deviation exceeds 2x tolerance', () => {
    expect(computeAccuracyMultiplier(potTs + toleranceMs * 2 + 1, potTs, toleranceMs)).toBe(0.0);
  });

  it('handles negative deviation (voter timestamp before PoT)', () => {
    expect(computeAccuracyMultiplier(potTs - 100, potTs, toleranceMs)).toBe(1.0);
    expect(computeAccuracyMultiplier(potTs - 1001, potTs, toleranceMs)).toBe(0.0);
  });
});

describe('computePoTHash', () => {
  const mockPoT: ProofOfTime = {
    medianTimestampMs: 1_700_000_000_000,
    sourcesCount: 3,
    stratum: 2,
    nonce: 'abc123',
    expiresAtMs: 1_700_000_060_000,
    readings: [],
  };

  it('returns a 0x-prefixed 32-byte hex string', () => {
    const hash = computePoTHash(mockPoT);
    expect(hash).toMatch(/^0x[0-9a-f]{64}$/i);
  });

  it('returns the same hash for identical inputs', () => {
    expect(computePoTHash(mockPoT)).toBe(computePoTHash(mockPoT));
  });

  it('returns different hashes for different timestamps', () => {
    const pot2 = { ...mockPoT, medianTimestampMs: 1_700_000_001_000 };
    expect(computePoTHash(mockPoT)).not.toBe(computePoTHash(pot2));
  });
});

describe('generateProofOfTime', () => {
  it('returns null when minSources cannot be met with zero sources', async () => {
    // Pass empty sources list — cannot meet minSources=2
    const result = await generateProofOfTime({
      timeSources: [],
      minSources: 2,
    });
    expect(result).toBeNull();
  });

  it('returns null when minSources=1 but no sources configured', async () => {
    const result = await generateProofOfTime({
      timeSources: [],
      minSources: 1,
    });
    expect(result).toBeNull();
  });

  // Note: live HTTPS source tests require network access.
  // In CI, mock fetch or use nock to intercept HTTPS calls.
});
