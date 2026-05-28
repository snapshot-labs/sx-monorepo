import { KnipConfig } from 'knip';

const config: KnipConfig = {
  ignoreUnresolved: [/^~icons\//],
  workspaces: {
    '.': {
      entry: ['scripts/*.ts']
    },
    'apps/api': {
      ignoreDependencies: ['@logtail/pino', 'pino-pretty']
    },
    'apps/highlight': {
      entry: ['src/index.ts']
    },
    'apps/hub': {
      entry: ['src/index.ts']
    },
    'apps/mana': {
      entry: ['src/index.ts'],
      ignoreDependencies: ['pg']
    },
    'apps/mcp': {},
    'apps/sequencer': {
      entry: ['src/**/*.ts'],
      ignoreDependencies: ['ajv']
    },
    'apps/ui': {
      entry: ['src/main.ts', 'src/**/*.vue', 'src/**/*.ts'],
      vite: false,
      ignoreDependencies: [
        '@vue/cli-plugin-babel',
        '@vitejs/plugin-vue',
        'unplugin-auto-import',
        'unplugin-vue-components',
        'rollup-plugin-visualizer',
        '@iconify-json/heroicons-solid',
        '@babel/core',
        '@graphql-typed-document-node/core',
        '@electron-forge/maker-dmg',
        '@electron-forge/maker-zip',
        'buffer',
        'events',
        'stream-browserify',
        'util'
      ]
    },
    'packages/eslint-config': {},
    'packages/eslint-config-vue': {},
    'packages/lock': {
      entry: ['src/**/*.ts'],
      ignoreDependencies: ['events']
    },
    'packages/prettier-config': {},
    'packages/sx.js': {
      ignoreBinaries: ['anvil', 'starknet-devnet']
    },
    'packages/tune': {
      entry: ['src/**/*.vue', 'src/**/*.ts'],
      vite: false,
      ignoreDependencies: [
        '@vitejs/plugin-vue',
        'unplugin-auto-import',
        '@iconify-json/heroicons-outline',
        '@iconify-json/heroicons-solid',
        '@vueuse/core'
      ]
    }
  }
};

export default config;
