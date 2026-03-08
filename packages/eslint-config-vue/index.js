import baseConfig, {
  prettierConfig,
  tsParser
} from '@snapshot-labs/eslint-config-base';
import pluginVue from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';

export default [
  ...baseConfig,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser
      }
    }
  },
  {
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/require-default-prop': 'off',
      'vue/no-v-html': 'off',
      'vue/custom-event-name-casing': ['error', 'camelCase']
    }
  },
  prettierConfig
];
