import { describe, expect, test } from 'bun:test';
import {
  closingParts,
  fieldParts,
  heroParts,
  nameOf,
  openingParts,
  scrollProgress,
  slideBehind,
  smoothstep,
  STEP
} from '../src/timeline';

describe('scrollProgress', () => {
  test('goes from 0 at the section top to 1 at its bottom', () => {
    expect(scrollProgress(500, 3000, 1000)).toBe(0);
    expect(scrollProgress(0, 3000, 1000)).toBe(0);
    expect(scrollProgress(-1000, 3000, 1000)).toBe(0.5);
    expect(scrollProgress(-2000, 3000, 1000)).toBe(1);
    expect(scrollProgress(-5000, 3000, 1000)).toBe(1);
  });

  test('is done when the section is not taller than the viewport', () => {
    expect(scrollProgress(0, 800, 1000)).toBe(1);
  });
});

describe('heroParts', () => {
  test('keeps every part in place at the top', () => {
    const parts = heroParts(0);
    for (const value of [
      parts.eyebrow,
      parts.title,
      parts.text,
      parts.button,
      parts.word(0)
    ]) {
      expect(value).toBe(0);
    }
  });

  test('staggers words so they leave one after another', () => {
    const parts = heroParts(0.1);
    expect(parts.word(0)).toBeGreaterThan(parts.word(3));
  });

  test('has cleared the hero by mid-scroll', () => {
    const parts = heroParts(0.5);
    expect([parts.title, parts.text]).toEqual([1, 1]);
  });
});

describe('fieldParts', () => {
  test('comes in as the hero leaves, holds, then leaves', () => {
    expect(fieldParts(0.2).title).toEqual([0, 0]);
    expect(fieldParts(0.5).title).toEqual([1, 0]);
    expect(fieldParts(0.5).text).toEqual([1, 0]);
    expect(fieldParts(0.8).title).toEqual([1, 1]);
    expect(fieldParts(0.8).word(6)).toEqual([1, 1]);
  });
});

describe('both steps', () => {
  test('run the same schedule', () => {
    for (const t of [0.05, 0.2, 0.35, 0.5, 0.65, 0.8]) {
      const first = t * 0.5;
      const second = first + 0.5;
      expect(fieldParts(second).title[1]).toBeCloseTo(
        heroParts(first).title,
        10
      );
      expect(fieldParts(second).word(2)[1]).toBeCloseTo(
        heroParts(first).word(2),
        10
      );
      expect(closingParts(second).title).toBeCloseTo(
        fieldParts(first).title[0],
        10
      );
      expect(closingParts(second).text).toBeCloseTo(
        fieldParts(first).text[0],
        10
      );
    }
  });
});

describe('closingParts', () => {
  test('stays away until the ripples have swept in', () => {
    const parts = closingParts(0.7);
    expect([parts.title, parts.text, parts.button, parts.word(0)]).toEqual([
      0, 0, 0, 0
    ]);
  });

  test('is in place at the end', () => {
    const parts = closingParts(1);
    expect([parts.title, parts.text, parts.button, parts.word(6)]).toEqual([
      1, 1, 1, 1
    ]);
  });
});

describe('openingParts', () => {
  test('is away on the blank page and in place once the hero rests', () => {
    const [blank, rest] = [openingParts(-STEP), openingParts(0)];
    expect([blank.title, blank.text, blank.button, blank.word(4)]).toEqual([
      0, 0, 0, 0
    ]);
    expect([rest.title, rest.text, rest.button, rest.word(4)]).toEqual([
      1, 1, 1, 1
    ]);
  });

  test('brings the copy in on the schedule of the closing copy', () => {
    for (const t of [0.5, 0.6, 0.7, 0.8]) {
      const [opening, closing] = [
        openingParts(-STEP + t * STEP),
        closingParts(STEP + t * STEP)
      ];
      expect(opening.title).toBeCloseTo(closing.title);
      expect(opening.word(2)).toBeCloseTo(closing.word(2));
      expect(opening.button).toBeCloseTo(closing.button);
    }
  });
});

describe('slideBehind', () => {
  test('follows the slides as they push in', () => {
    expect([0, 0.4, 1].map(p => slideBehind(p, 0))).toEqual([1, 2, 3]);
  });

  test('starts on the blank page as it opens, the hero pushing in from the right', () => {
    expect(slideBehind(-STEP, 0)).toBe(0);
    expect(slideBehind(-STEP + 0.152, 0.9)).toBe(1);
    expect(slideBehind(-STEP + 0.152, 0)).toBe(0);
  });

  test('changes a tab on the right first, since slides come in from the right', () => {
    expect(slideBehind(0.152, 0.9)).toBe(2);
    expect(slideBehind(0.152, 0)).toBe(1);
  });
});

describe('nameOf', () => {
  test('reads the page or slide from a hash, slashes or not', () => {
    expect(
      ['#/protocol', '#protocol', '#/protocol/', '#/terms'].map(nameOf)
    ).toEqual(['protocol', 'protocol', 'protocol', 'terms']);
    expect(['', '#', '#/'].map(nameOf)).toEqual(['', '', '']);
  });
});

describe('smoothstep', () => {
  test('eases between its edges', () => {
    expect(smoothstep(0, 1, 0.5)).toBe(0.5);
    expect(smoothstep(0, 1, -1)).toBe(0);
    expect(smoothstep(0, 1, 2)).toBe(1);
  });
});
