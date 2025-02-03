import { describe, expect, it } from 'vitest';
import { formatQuorum, getProposalCurrentQuorum } from './quorum';

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
});

describe('formatQuorum', () => {
  it('should format using 3 significant digits', () => {
    expect(formatQuorum(0.001)).toBe('0.1%');
    expect(formatQuorum(0.1234)).toBe('12.3%');
    expect(formatQuorum(0.555667)).toBe('55.5%');
    expect(formatQuorum(4.446326)).toBe('444%');
    expect(formatQuorum(999.90111)).toBe('99.9k%');
  });

  it('should not round up but truncate', () => {
    expect(formatQuorum(0.9999)).toBe('99.9%');
  });

  it('should format big numbers in compact format', () => {
    expect(formatQuorum(1000)).toBe('100k%');
    expect(formatQuorum(1234)).toBe('123k%');
    expect(formatQuorum(5556)).toBe('555k%');
    expect(formatQuorum(44444)).toBe('4.44m%');
  });
});
