import vueConfig from '@snapshot-labs/eslint-config-vue';
import storybook from 'eslint-plugin-storybook';
import autoImportGlobals from './.eslintrc-auto-import.json' with { type: 'json' };

export default [
  ...vueConfig,
  ...storybook.configs['flat/recommended'],
  {
    languageOptions: {
      globals: autoImportGlobals.globals
    }
  },
  {
    // public/blst.js is emscripten output copied from the private-vote-sdk
    ignores: ['**/gql/**', 'public/blst.js']
  }
];
