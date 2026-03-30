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
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' }
      ]
    }
  },
  {
    ignores: ['dist/**', 'storybook-static/**']
  }
];
