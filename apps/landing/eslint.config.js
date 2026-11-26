import vueConfig from '@snapshot-labs/eslint-config-vue';

export default [
  ...vueConfig,
  {
    // Formatting is checked by `bun fmt`
    rules: { 'prettier/prettier': 'off' }
  }
];
