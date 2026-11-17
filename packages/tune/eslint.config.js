import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import vueConfig from '@snapshot-labs/eslint-config-vue';
import oxlint from 'eslint-plugin-oxlint';
import storybook from 'eslint-plugin-storybook';

// oxlint skips .vue files whose <script> opening tag spans several lines,
// so ESLint keeps every rule on them
const skippedByOxlint = readdirSync(path.join(import.meta.dirname, 'src'), {
  recursive: true
})
  .filter(file => file.endsWith('.vue'))
  .map(file => path.join('src', file))
  .filter(file =>
    /^<script\b(?![^\n]*>\s*$)/m.test(
      readFileSync(path.join(import.meta.dirname, file), 'utf8')
    )
  );

export default [
  {
    // oxlint reads the same eslint-disable comments, so ESLint must not
    // report or remove the ones for rules it has handed over
    linterOptions: { reportUnusedDisableDirectives: 'off' }
  },
  ...vueConfig,
  ...storybook.configs['flat/recommended'],
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' }
      ],
      'import-x/no-duplicates': ['error', { 'prefer-inline': false }],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ImportSpecifier[importKind="type"]',
          message:
            'Use `import type { ... }` instead of inline `import { type ... }`'
        }
      ]
    }
  },
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
    ignores: ['dist/**', 'storybook-static/**']
  }
];
