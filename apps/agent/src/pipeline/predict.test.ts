import { describe, expect, test } from 'bun:test';
import { meetsConfidence } from './predict';

describe('meetsConfidence', () => {
  test('lets through predictions at or above the floor', () => {
    expect(meetsConfidence('high')).toBe(true);
    expect(meetsConfidence('medium')).toBe(true);
  });

  test('stops predictions below the floor', () => {
    expect(meetsConfidence('low')).toBe(false);
  });

  test('stops anything it does not know', () => {
    expect(meetsConfidence('certain')).toBe(false);
  });
});
