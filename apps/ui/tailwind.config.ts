import { Config } from 'tailwindcss';
import tunePreset from '@snapshot-labs/tune/tailwind-preset';

const ELECTRON_TITLEBAR_HEIGHT = !!process.env.ELECTRON ? 32 : 0;
const APP_TOPNAV_HEIGHT = 72;

export const TOTAL_NAV_HEIGHT = ELECTRON_TITLEBAR_HEIGHT + APP_TOPNAV_HEIGHT;

const TOTAL_WITH_SECTION = TOTAL_NAV_HEIGHT + 41;

// On some mobile devices (reproduced on Android only) consecutive sticky elements sometimes get out of sync when scrolling.
// To prevent that we offset those elements by 1px so they overlap slightly preventing gaps.
const STICKY_ELEMENT_BUFFER = 1;

export default {
  presets: [tunePreset],
  content: [
    './index.html',
    './src/**/*.{js,ts,vue}',
    '../../packages/tune/src/**/*.vue'
  ],
  theme: {
    extend: {
      gridTemplateColumns: {
        'explore-3': 'repeat(3, minmax(0, 230px))',
        'explore-4': 'repeat(4, minmax(0, 230px))',
        'explore-5': 'repeat(5, minmax(0, 230px))'
      },
      spacing: {
        // Layout heights
        'header-height': `${TOTAL_NAV_HEIGHT}px`,
        'electron-titlebar-height': `${ELECTRON_TITLEBAR_HEIGHT}px`,
        'header-height-with-offset': `${TOTAL_NAV_HEIGHT - STICKY_ELEMENT_BUFFER}px`,
        'header-with-section-height': `${TOTAL_WITH_SECTION}px`,
        'header-with-section-height-with-offset': `${TOTAL_WITH_SECTION - 2 * STICKY_ELEMENT_BUFFER}px`
      }
    }
  }
} satisfies Config;
