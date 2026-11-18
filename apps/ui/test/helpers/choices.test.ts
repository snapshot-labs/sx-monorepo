import { describe, expect, it } from 'vitest';
import {
  getChoiceColors,
  getScoresTicks,
  getVisibleChoicesCount
} from '@/helpers/choices';

const HOUR = 3600;

describe('getChoiceColors', () => {
  it('should keep the For / Against / Abstain colors on basic proposals', () => {
    expect(
      getChoiceColors({
        type: 'basic',
        choices: ['For', 'Against', 'Abstain'],
        scores: [1, 2, 3]
      })
    ).toEqual([
      'rgb(var(--success))',
      'rgb(var(--danger))',
      'rgb(var(--text))'
    ]);
  });

  it('should color choices by score', () => {
    expect(
      getChoiceColors({
        type: 'single-choice',
        choices: ['A', 'B', 'C'],
        scores: [1, 3, 2]
      })
    ).toEqual(['var(--choice-3)', 'var(--choice-1)', 'var(--choice-2)']);
  });

  it('should only color the leading choices when there are many', () => {
    const scores = [0, 9, 0, 3, 7, 6, 5, 4, 8, 2, 1];

    expect(
      getChoiceColors({ type: 'approval', choices: scores.map(String), scores })
    ).toEqual([
      undefined,
      'var(--choice-1)',
      undefined,
      undefined,
      'var(--choice-3)',
      'var(--choice-4)',
      'var(--choice-5)',
      'var(--choice-6)',
      'var(--choice-2)',
      undefined,
      undefined
    ]);
  });

  it('should color a lone extra choice', () => {
    const colors = getChoiceColors({
      type: 'weighted',
      choices: Array(7).fill(''),
      scores: []
    });

    expect(colors[6]).toBe('var(--choice-7)');
  });

  it('should color the first choices when there are no scores yet', () => {
    expect(
      getChoiceColors({ type: 'weighted', choices: ['A', 'B'], scores: [] })
    ).toEqual(['var(--choice-1)', 'var(--choice-2)']);
  });
});

describe('getVisibleChoicesCount', () => {
  it('should show a lone extra choice rather than group it', () => {
    expect(getVisibleChoicesCount(3)).toBe(6);
    expect(getVisibleChoicesCount(7)).toBe(7);
    expect(getVisibleChoicesCount(8)).toBe(6);
  });
});

describe('getScoresTicks', () => {
  it('should return one cumulative tick per hour with votes', () => {
    expect(
      getScoresTicks('single-choice', 3, [
        { choice: 1, vp: 10, created: HOUR + 1 },
        { choice: 3, vp: 5, created: HOUR + 2 },
        { choice: 1, vp: 1, created: 3 * HOUR }
      ])
    ).toEqual([
      { timestamp: HOUR, scores: [10, 0, 5] },
      { timestamp: 3 * HOUR, scores: [11, 0, 5] }
    ]);
  });

  it('should give the full voting power to each approved choice', () => {
    expect(
      getScoresTicks('approval', 3, [
        { choice: [1, 2], vp: 10, created: 0 },
        { choice: [2], vp: 5, created: 1 },
        { choice: [], vp: 5, created: 2 }
      ])
    ).toEqual([{ timestamp: 0, scores: [10, 15, 0] }]);
  });

  it('should split the voting power by weight on weighted votes', () => {
    expect(
      getScoresTicks('weighted', 3, [
        { choice: { 1: 1, 2: 3 }, vp: 100, created: 0 },
        { choice: { 3: 1 }, vp: 10, created: 1 }
      ])
    ).toEqual([{ timestamp: 0, scores: [25, 75, 10] }]);
  });

  it('should compute quadratic scores scaled to the voting power', () => {
    const [{ scores }] = getScoresTicks('quadratic', 2, [
      { choice: { 1: 1 }, vp: 100, created: 0 },
      { choice: { 2: 1 }, vp: 25, created: 1 },
      { choice: { 2: 1 }, vp: 25, created: 2 }
    ]);

    // (√100)² = 100 and (√25 + √25)² = 100, scaled to 150
    expect(scores).toEqual([75, 75]);
  });

  it('should run an instant-runoff on ranked choice votes', () => {
    const [{ scores }] = getScoresTicks('ranked-choice', 3, [
      { choice: [1, 2, 3], vp: 40, created: 0 },
      { choice: [2, 3, 1], vp: 35, created: 1 },
      { choice: [3, 2, 1], vp: 25, created: 2 }
    ]);

    // Nobody has the majority: choice 3 is dropped and its votes go to 2
    expect(scores).toEqual([40, 60, 0]);
  });

  it('should ignore invalid choices', () => {
    expect(
      getScoresTicks('single-choice', 2, [{ choice: 3, vp: 1, created: 0 }])
    ).toEqual([{ timestamp: 0, scores: [0, 0] }]);
    expect(
      getScoresTicks('ranked-choice', 3, [
        { choice: [1, 2], vp: 1, created: 0 }
      ])
    ).toEqual([{ timestamp: 0, scores: [0, 0, 0] }]);
    expect(
      getScoresTicks('weighted', 2, [
        { choice: { 1: 0 }, vp: 1, created: 0 },
        { choice: { 1.5: 1 }, vp: 1, created: 0 },
        { choice: { __proto__: 1 }, vp: 1, created: 0 }
      ])
    ).toEqual([{ timestamp: 0, scores: [0, 0] }]);
  });

  it('should ignore choices that do not fit the voting type', () => {
    expect(
      getScoresTicks('quadratic', 2, [{ choice: 1, vp: 1, created: 0 }])
    ).toEqual([{ timestamp: 0, scores: [0, 0] }]);
    expect(
      getScoresTicks('basic', 3, [{ choice: [1, 2], vp: 1, created: 0 }])
    ).toEqual([{ timestamp: 0, scores: [0, 0, 0] }]);
  });
});
