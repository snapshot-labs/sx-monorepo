import fs from 'node:fs';
import path from 'node:path';
import { includeIgnoreFile } from '@eslint/compat';
import importPlugin from 'eslint-plugin-import-x';
import prettierPlugin from 'eslint-plugin-prettier/recommended';
import tseslint from 'typescript-eslint';

const gitignorePath = path.resolve(process.cwd(), '.gitignore');
const gitignoreConfig = fs.existsSync(gitignorePath)
  ? [includeIgnoreFile(gitignorePath)]
  : [];

export default [
  ...gitignoreConfig,
  {
    ignores: ['**/dist/**']
  },
  ...tseslint.configs.recommended,
  prettierPlugin,
  {
    plugins: {
      'import-x': importPlugin
    },
    rules: {
      'prefer-template': 'error',
      'lines-between-class-members': [
        'error',
        'always',
        { exceptAfterSingleLine: true }
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CatchClause > Identifier[name=/^(e|error)$/]',
          message:
            "Use 'err' instead of 'e', 'error', or use more descriptive name."
        },
        {
          selector:
            'Identifier[name=/^(e|evt)$/][typeAnnotation.typeAnnotation.typeName.name=/Event$/]',
          message: "Use 'event' instead of 'e' or 'evt' for event parameters."
        }
      ],
      'sort-imports': [
        'error',
        {
          ignoreCase: true,
          ignoreDeclarationSort: true
        }
      ],
      'import-x/no-duplicates': ['error', { 'prefer-inline': true }],
      'import-x/no-extraneous-dependencies': 'error',
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'type'],
          pathGroups: [
            {
              pattern: 'vue',
              group: 'builtin',
              position: 'before'
            },
            {
              pattern: 'vitest',
              group: 'builtin',
              position: 'before'
            },
            {
              pattern: '@vue/**',
              group: 'builtin',
              position: 'before'
            },
            {
              pattern: '@/**',
              group: 'internal'
            }
          ],
          'newlines-between': 'never',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true
          }
        }
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'no-type-imports' }
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off'
    }
  }
];
