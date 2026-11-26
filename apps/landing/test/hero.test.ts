import { describe, expect, test } from 'bun:test';
import {
  ASCII,
  ASCII_GLYPH,
  asciiFrame,
  asciiGrid,
  asciiOrigin,
  asciiPath,
  FIELD_REFERENCE,
  glyphRect,
  heroBoxes,
  tornadoField
} from '../src/hero';

describe('heroBoxes', () => {
  test('sizes every box from the frame proportions', () => {
    const boxes = heroBoxes(4, 1000, 600, () => 0.5);
    expect(boxes).toHaveLength(4);
    for (const box of boxes) {
      expect(box).toEqual({
        x: Math.floor(0.5 * (1000 - 100) - 75),
        y: Math.floor(0.5 * (600 - 84) - 63),
        width: 250,
        height: 210
      });
    }
  });
});

describe('zero-size frames', () => {
  test('a hidden or collapsed hero still draws without throwing', () => {
    expect(heroBoxes(0, 1000, 600, Math.random)).toEqual([]);
    expect(heroBoxes(4, 0, 600, () => 0.5).every(b => b.width === 0)).toBe(
      true
    );
    expect(asciiGrid(0, 0)).toEqual({ cols: 1, rows: 2 });
    expect(asciiPath(asciiFrame(1, 2, 0), 0, 0)).toBeTypeOf('string');
  });
});

describe('asciiFrame', () => {
  test('grid follows the frame and covers its full width', () => {
    expect(asciiGrid(1440, 900)).toEqual({
      cols: Math.ceil(1440 / ASCII_GLYPH.pitch),
      rows: 115
    });
    for (const width of [390, 1470, 4000]) {
      expect(
        asciiGrid(width, 80).cols * ASCII_GLYPH.pitch
      ).toBeGreaterThanOrEqual(width);
    }
  });

  test('renders rows of the requested width using only the palette', () => {
    const lines = asciiFrame(40, 12, 0).split('\n');
    expect(lines).toHaveLength(12);
    const palette = new Set<string>(ASCII.chars);
    for (const line of lines) {
      expect([...line]).toHaveLength(40);
      for (const ch of line) expect(palette.has(ch)).toBe(true);
    }
  });

  test('up to the reference width, the field is the tornado as it was', () => {
    for (const [cols, rows] of [
      [40, 12],
      [FIELD_REFERENCE.cols, 115]
    ] as const) {
      const lines = asciiFrame(cols, rows, 3).split('\n');
      for (const [x, y] of [
        [0, 0],
        [cols - 1, rows - 1],
        [Math.floor(cols / 3), Math.floor(rows / 2)]
      ] as const) {
        const level = tornadoField(x, y, cols, rows, 1.5);
        const ch =
          ASCII.chars[Math.max(0, Math.min(Math.floor((level + 1) * 2), 4))];
        expect(lines[y]?.[x]).toBe(ch);
      }
    }
  });

  test('a wider screen shows the same field around the copy', () => {
    const { cols } = FIELD_REFERENCE;
    const reference = asciiFrame(cols, 115, 3).split('\n');
    const wider = asciiFrame(cols + 104, 115, 3).split('\n');
    for (let y = 0; y < 115; y += 1) {
      expect(wider[y]?.slice(52, 52 + cols)).toBe(reference[y]);
    }
  });

  test('the eye of the storm stays blank', () => {
    const cols = 200;
    const rows = 100;
    const x = Math.round(cols * 0.5);
    const y = Math.round(rows * 0.5 + rows * 0.1);
    expect(tornadoField(x, y, cols, rows, 0)).toBeLessThan(-0.5);
    expect(asciiFrame(cols, rows, 0).split('\n')[y]?.[x]).toBe(' ');
  });
});

describe('asciiPath', () => {
  test('centres the grid on the field', () => {
    expect(asciiOrigin(1000, 400, 100, 50)).toEqual({
      x: (1000 - 100 * ASCII_GLYPH.pitch) / 2,
      y: 0
    });
  });

  test('keeps a column edge in the middle of any screen', () => {
    for (const w of [390, 1441, 2200, 3840]) {
      const grid = asciiGrid(w, 900);
      const origin = asciiOrigin(w, 900, grid.cols, grid.rows);
      expect(origin.x + (grid.cols / 2) * ASCII_GLYPH.pitch).toBeCloseTo(w / 2);
    }
  });

  test('draws period and dot boxes, nothing for other glyphs', () => {
    const period = glyphRect('.', 10, 20);
    expect(period?.x).toBeCloseTo(12.66);
    expect(period?.y).toBeCloseTo(17.24);
    expect(period?.width).toBeCloseTo(2.41);
    expect(period?.height).toBeCloseTo(2.76);
    expect(glyphRect('⋅', 0, 20)?.y).toBeCloseTo(14.09);
    expect(glyphRect('^', 0, 20)).toBeNull();
    expect(glyphRect(' ', 0, 20)).toBeNull();
  });

  test('draws one closed shape per visible glyph and nothing for spaces', () => {
    expect(asciiPath('^ .\n⋅  ', 100, 40).match(/Z/g)).toHaveLength(3);
    expect(asciiPath('   \n   ', 100, 40)).toBe('');
  });
});
