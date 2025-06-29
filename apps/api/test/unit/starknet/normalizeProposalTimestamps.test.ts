import { describe, it, expect } from 'vitest';
import { normalizeProposalTimestamps } from '../../../src/starknet/writers';

describe('normalizeProposalTimestamps', () => {
  it('should return created timestamp without adjustment', () => {
    const res = normalizeProposalTimestamps(1000n, 1200n, 100n, false);
    expect(res).toEqual({ created: 900n, start: 1000n, minEnd: 1200n });
  });

  it('should apply minimum delay for erc20votes', () => {
    const res = normalizeProposalTimestamps(1000n, 1020n, 100n, true);
    expect(res).toEqual({ created: 900n, start: 1500n, minEnd: 1500n });
  });

  it('should keep start if already greater than minimum delay', () => {
    const res = normalizeProposalTimestamps(2000n, 2020n, 1000n, true);
    expect(res).toEqual({ created: 1000n, start: 2000n, minEnd: 2020n });
  });
});
