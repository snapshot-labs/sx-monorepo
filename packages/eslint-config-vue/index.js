module.exports = {
  extends: ['plugin:vue/recommended', '@snapshot-labs/eslint-config-base'],
  rules: {
    'vue/multi-word-component-names': 'off',
    'vue/require-default-prop': 'off',
    'vue/no-v-html': 'off',
    'vue/custom-event-name-casing': ['error', 'camelCase']
  },
  overrides: [
    {
      files: ['*.vue'],
      parser: 'vue-eslint-parser',
      parserOptions: {
        parser: '@typescript-eslint/parser'
      }
    }
  ]
};
