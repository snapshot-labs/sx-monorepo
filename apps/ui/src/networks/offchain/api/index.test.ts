import { describe, expect, it } from 'vitest';
import { getProposalState } from './index';

// A closed basic proposal whose scores make "For" win.
const closed = (extra: Record<string, unknown>) =>
  ({
    state: 'closed',
    type: 'basic',
    scores: [10, 2, 0],
    scores_total: 12,
    quorum: 0,
    quorumType: 'default',
    privacy: '',
    scores_state: 'pending',
    ...extra
  }) as any;

describe('getProposalState', () => {
  // A public proposal shows its outcome before its scores are final. A private
  // one has zero scores until the committee's result lands, so it stays
  // "closed" until its tally is final.
  it.each([
    ['public, pending scores', { scores_state: 'pending' }, 'passed'],
    ['public, invalid scores', { scores_state: 'invalid' }, 'passed'],
    [
      'private, pending scores',
      { privacy: 'shutter-elgamal', scores: [0, 0, 0], scores_total: 0 },
      'closed'
    ],
    [
      'private, final scores',
      { privacy: 'shutter-elgamal', scores_state: 'final' },
      'passed'
    ]
  ])('a closed %s proposal is %s', (_label, extra, state) => {
    expect(getProposalState('s', closed(extra))).toBe(state);
  });
});
