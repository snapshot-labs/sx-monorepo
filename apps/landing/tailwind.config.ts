import tunePreset from '@snapshot-labs/tune/tailwind-preset';
import { Config } from 'tailwindcss';

export default {
  presets: [tunePreset],
  content: ['./index.html', './src/**/*.vue'],
  theme: {
    extend: {
      colors: {
        yellow: '#fafe69'
      },
      animation: {
        marquee: 'marquee 10s linear infinite'
      },
      keyframes: {
        marquee: {
          to: { transform: 'translateX(calc(-1 * var(--copy-width, 0px)))' }
        }
      }
    }
  }
} satisfies Config;
