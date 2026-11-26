import { describe, expect, it } from 'vitest';
import { formatQuorum, getProposalCurrentQuorum } from '@/helpers/quorum';

describe('getProposalCurrentQuorum', () => {
  it('should only use for and abstain votes for onchain spaces', () => {
    const currentQuorum = getProposalCurrentQuorum('eth', {
      scores: [11, 20, 100],
      scores_total: 131
    });

    expect(currentQuorum).toBe(111);
  });

  it('should use total score for offchain spaces', () => {
    const currentQuorum = getProposalCurrentQuorum('s', {
      scores: [11, 20, 100],
      scores_total: 131
    });

    expect(currentQuorum).toBe(131);
  });

  it('should only use against votes for rejection quorum', () => {
    const currentQuorum = getProposalCurrentQuorum('s', {
      scores: [11, 20, 100],
      scores_total: 131,
      quorum_type: 'rejection'
    });

    expect(currentQuorum).toBe(20);
  });

  it('should only use for votes for for_only quorum type', () => {
    const currentQuorum = getProposalCurrentQuorum('eth', {
      scores: [11, 20, 100],
      scores_total: 131,
      quorum_type: 'for_only'
    });

    expect(currentQuorum).toBe(11);
  });
});

describe('formatQuorum', () => {
  it('should format using 3 significant digits', () => {
    expect(formatQuorum(0.001)).toBe('0.1%');
    expect(formatQuorum(0.1234)).toBe('12.3%');
    expect(formatQuorum(0.555667)).toBe('55.5%');
    expect(formatQuorum(4.446326)).toBe('444%');
  });

  it('should not round up but truncate', () => {
    expect(formatQuorum(0.9999)).toBe('99.9%');
    expect(formatQuorum(9.9999)).toBe('999%');
  });

  it('should show >100% from 1000%', () => {
    expect(formatQuorum(10)).toBe('>100%');
    expect(formatQuorum(1234)).toBe('>100%');
    // A quorum of 1 raw unit makes the ratio astronomically large
    expect(formatQuorum(716624324)).toBe('>100%');
    expect(formatQuorum(9.2e23)).toBe('>100%');
    expect(formatQuorum(Infinity)).toBe('>100%');
  });
});
