/**
 * This script will import all skins from the snapshot-spaces repository
 * (https://github.com/snapshot-labs/snapshot-spaces/tree/master/skins)
 * into the hub database
 *
 * Only color variables will be imported, and each space will be associated to its
 * own skin (1-1 relationship).
 * Only skins for spaces with custom domain will be imported
 *
 * All imported colors will be in 6-character hex format, and will not support transparency.
 * All colors with transparency will be opacified, based on the background color
 *
 * To run this script: bunx ts-node scripts/import-skins.ts
 */

import 'dotenv/config';
import kebabCase from 'lodash/kebabCase';
import fetch from 'node-fetch';
import db from '../src/helpers/mysql';

const SKINS_ROOT_PATH =
  'https://raw.githubusercontent.com/snapshot-labs/snapshot-spaces/refs/heads/master/skins/';

const COLOR_MAP = {
  white: 'ffffff',
  black: '000000',
  red: 'ff0000',
  green: '00ff00',
  blue: '0000ff',
  yellow: 'ffff00',
  lightgrey: 'd3d3d3',
  orange: 'ffa500',
  darkgrey: 'a9a9a9',
  darkgray: 'a9a9a9',
  darkgoldenrod: 'b8860b'
};

const SKIN_COLORS = ['primary', 'bg', 'text', 'link', 'border', 'header', 'heading'];

const skins = {};

/**
 * Get brightness from a RGB color
 *
 * @param r
 * @param g
 * @param b
 * @returns brightness value between 0 (black) and 1 (white)
 */
function getBrightness(r: number, g: number, b: number): number {
  // Normalize RGB values to 0-1 range
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  // Apply luminance formula
  const luminance = 0.2126 * rNorm + 0.7152 * gNorm + 0.0722 * bNorm;

  return luminance;
}

/**
 * Convert HEX color to RGBA
 *
 * @param color hex color, 6 or 8 characters (ffffff or ffffff22)
 * @returns 4-element array with RGBA values
 */
function hexToRgba(color: string): number[] {
  return [
    parseInt(color.slice(0, 2), 16),
    parseInt(color.slice(2, 4), 16),
    parseInt(color.slice(4, 6), 16),
    parseInt(color.slice(6, 8) || 'ff', 16) / 255
  ];
}

/**
 * Convert RGB color to HEX color
 *
 * @param r
 * @param g
 * @param b
 * @returns 6-character HEX color string
 */
function rgbToHex(r: number, g: number, b: number): string {
  return [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
}

/**
 * Convert RGBA color with transparency to HEX color without transparency,
 * based on a base color
 *
 * @param rgba 4-element array with RGBA values
 * @param baseColor 3-element array with RGB values
 * @returns 6-character HEX color string
 */
function opacifyColor(rgba: number[], baseColor: number[]): string {
  const [r, g, b, a] = rgba;
  const [br, bg, bb] = baseColor;
  const rrr = Math.round(r * a + br * (1 - a));
  const ggg = Math.round(g * a + bg * (1 - a));
  const bbb = Math.round(b * a + bb * (1 - a));

  return rgbToHex(rrr, ggg, bbb);
}

/**
 * Extract 4-element array values from CSS color function
 *
 * @param color CSS color function (e.g. `rgba(255, 0, 0, 0.5)`)
 * @returns 4-element array with RGBA/HSLA values
 */
function extractColorFunctionValues(color: string): number[] {
  const rgba = color
    .replace(/^(rgb|hsl)a?\(|\)$/g, '')
    .split(/[ ,\s\/]/)
    .filter(a => !!a)
    .map((c, i) => {
      let divider = 1;
      if (c.includes('%')) {
        divider = 100;
      } else if (i === 0 && color.includes('hsl')) {
        divider = 360;
      }

      return Number(c.replace(/%|deg/, '')) / divider;
    });

  if (rgba.length === 3) {
    rgba.push(1);
  }

  if (rgba.length !== 4) {
    throw new Error(`unsupported color function: ${color}`);
  }

  return rgba;
}

/**
 * Translate CSS color to HEX color without transparency when possible
 *
 * @param color css color value (see https://developer.mozilla.org/en-US/docs/Web/CSS/color_value)
 * @param baseColor 6-character HEX color string
 * @returns 6-character HEX color string, or undefined if translation is not possible
 */
function translateCssColor(color: string, baseColor: string): string | undefined {
  // Color format is `fff`
  if (/^[a-f0-9]{3}$/i.test(color)) {
    return color
      .split('')
      .map(c => c.repeat(2))
      .join('');
  }

  // Color format is `ffffff`
  if (/^[a-f0-9]{6}$/i.test(color)) {
    return color;
  }

  // Color format is `white`
  if (COLOR_MAP[color]) {
    return COLOR_MAP[color];
  }

  // Return base color, as transparency is not supported
  if (color == 'transparent' || color === 'none') {
    return baseColor;
  }

  // For all remaining formats, transform to RGBA first, then remove transparency
  let rgba: number[] = [];

  try {
    if (/^(rgb|hsl)a?/.test(color)) {
      // Color format is `rgb()`, `rgba()`, `hsl()` or `hsla()`
      rgba = extractColorFunctionValues(color);
    } else if (/[a-f0-9]{8}/.test(color))
      // Color format is `ffffff22`
      rgba = hexToRgba(color);

    if (rgba.length !== 4) {
      throw new Error(`unable to translate color to RGBA: ${color}`);
    }

    return opacifyColor(rgba, hexToRgba(baseColor || 'ffffff'));
  } catch (e) {
    console.log(e);
  }
}

async function loadAndConvertSkin(skin: string) {
  if (skins[skin]) return;

  try {
    // kebabcase only strings with uppercase, and skip name with number like `tw33t`
    const skinName = /[A-Z]/.test(skin) ? kebabCase(skin) : skin;
    const response = await fetch(`${SKINS_ROOT_PATH}${skinName}.scss`);
    const body = await response.text();
    const settings = { theme: 'light' };

    if (response.status !== 200) {
      return;
    }

    SKIN_COLORS.forEach(key => {
      const matches = body.match(new RegExp(`--${key}-(color|bg):(?<color>.*);`, 'm'));

      if (!matches) {
        return;
      }

      const color = translateCssColor(
        matches.groups.color.replace('#', '').trim().toLowerCase(),
        settings['bg_color']
      );
      if (!color) return;

      settings[`${key}_color`] = color;
    });

    if (settings['text_color']) {
      settings['content_color'] = settings['text_color'];
      const textRgba = hexToRgba(settings['text_color']);
      textRgba[3] = 0.85;

      settings['text_color'] = opacifyColor(textRgba, hexToRgba(settings['bg_color'] || 'ffffff'));
    }

    if (settings['bg_color']) {
      const [r, g, b] = hexToRgba(settings['bg_color']);
      settings['theme'] = getBrightness(r, g, b) > 0.5 ? 'light' : 'dark';
    }

    skins[skin] = settings;
  } catch (e) {
    console.log(e);
  }
}

async function main() {
  const startTime = new Date().getTime();

  const spacesWithCustomDomain = await db.queryAsync(`
    SELECT
      id,
      JSON_UNQUOTE(settings->'$.skin') as skin
    FROM spaces
    WHERE
      settings->'$.skin' IS NOT NULL
      AND domain IS NOT NULL
  `);

  await Promise.all(spacesWithCustomDomain.map(s => loadAndConvertSkin(s.skin)));

  console.log(
    `Found ${Object.keys(skins).length} skins to import into ${
      spacesWithCustomDomain.length
    } spaces`
  );

  await Promise.all(
    spacesWithCustomDomain.map(space => {
      const skin = skins[space.skin];
      if (!skin) {
        console.log(`[ERROR] skin ${space.skin} not found for ${space.id}`);
        return;
      }

      console.log(`importing skin ${space.skin} for ${space.id}`);

      return db.queryAsync(
        `
          INSERT INTO skins (
            id, bg_color, link_color, text_color, content_color,
            border_color, heading_color, primary_color, header_color, theme
          )
          VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE id=id
        `,
        [
          space.id,
          skin.bg_color,
          skin.link_color,
          skin.text_color,
          skin.content_color,
          skin.border_color,
          skin.heading_color,
          skin.primary_color,
          skin.header_color,
          skin.theme
        ]
      );
    })
  );

  console.log(`Done! ✅ in ${(Date.now() - startTime) / 1000}s`);
}

(async () => {
  try {
    await main();
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
