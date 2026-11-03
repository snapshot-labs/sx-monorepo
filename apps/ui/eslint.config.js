import vueConfig from '@snapshot-labs/eslint-config-vue';
import oxlint from 'eslint-plugin-oxlint';
import storybook from 'eslint-plugin-storybook';

// oxlint skips .vue files whose <script> opening tag spans several lines,
// so ESLint keeps every rule on them
const skippedByOxlint = ['src/components/Ui/SelectDropdown.vue'];

export default [
  {
    // oxlint reads the same eslint-disable comments, so ESLint must not
    // report or remove the ones for rules it has handed over
    linterOptions: { reportUnusedDisableDirectives: 'off' }
  },
  ...vueConfig,
  ...storybook.configs['flat/recommended'],
  ...oxlint
    .buildFromOxlintConfigFile('../../.oxlintrc.json')
    .filter(config => config.name !== 'oxlint/oxlint-config-ignore-patterns')
    .map(config => ({
      ...config,
      ignores: [...(config.ignores ?? []), ...skippedByOxlint]
    })),
  {
    rules: {
      'import-x/no-extraneous-dependencies': 'off',
      'import-x/order': 'off',
      'lines-between-class-members': 'off',
      'prettier/prettier': 'off'
    }
  },
  {
    ignores: ['**/gql/**']
  }
];
