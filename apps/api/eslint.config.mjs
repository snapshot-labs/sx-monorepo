import baseConfig from '@snapshot-labs/eslint-config';

export default [
  ...baseConfig,
  {
    rules: {
      'no-console': 'error'
    }
  }
];
