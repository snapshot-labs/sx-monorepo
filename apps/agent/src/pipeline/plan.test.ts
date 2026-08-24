import { describe, expect, test } from 'bun:test';
import { isEligible } from './plan';
import { Proposal } from '../clients/hub';

const proposal = (overrides: Partial<Proposal> = {}): Proposal => ({
  id: '0x1',
  space: { id: 'robots.0cf5e.eth' },
  title: 'Test',
  type: 'single-choice',
  privacy: '',
  choices: ['For', 'Against'],
  end: 0,
  ...overrides
});

describe('isEligible', () => {
  test('accepts proposals with open votes', () => {
    expect(isEligible(proposal())).toBe(true);
  });

  test('rejects encrypted proposals', () => {
    expect(isEligible(proposal({ privacy: 'shutter' }))).toBe(false);
  });
});
