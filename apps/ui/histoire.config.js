import { defineConfig } from 'histoire';
import { HstVue } from '@histoire/plugin-vue';

export default defineConfig({
  plugins: [HstVue()],
  setupFile: './src/histoire-setup.ts',
  theme: {
    defaultColorScheme: 'light',
    favicon: './public/favicon-temp.svg',
    title: 'Tune UI',
    colors: {
      gray: {
        50: '#FBFBFB',
        100: '#FBFBFB',
        200: '#FBFBFB',
        300: '#EDEDED',
        400: '#EDEDED',
        500: '#A09FA4',
        600: '#A09FA4',
        700: '#1C1B20',
        750: '#29282E',
        800: '#29282E',
        850: '#29282E',
        900: '#29282E',
        950: '#29282E'
      },
      primary: {
        50: '#EDEDED',
        100: '#EDEDED',
        200: '#EDEDED',
        300: '#f3b04e',
        400: '#f3b04e',
        500: '#f3b04e',
        600: '#f3b04e',
        700: '#f3b04e',
        800: '#f3b04e',
        900: '#29282E'
      }
    }
  },
  backgroundPresets: []
});
