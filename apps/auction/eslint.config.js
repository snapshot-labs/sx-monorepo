import vueConfig from '@snapshot-labs/eslint-config-vue';
import autoImportGlobals from './.eslintrc-auto-import.json' with { type: 'json' };

export default [
  ...vueConfig,
  {
    languageOptions: {
      globals: autoImportGlobals.globals
    }
  },
  {
    ignores: ['**/gql/**']
  }
];
