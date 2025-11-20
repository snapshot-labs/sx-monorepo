import { CodegenConfig } from '@graphql-codegen/cli';

const baseConfig: CodegenConfig['config'] = {
  preset: 'client',
  config: {
    enumsAsTypes: true,
    skipTypename: true,
    avoidOptionals: {
      field: true,
      inputValue: false
    }
  },
  presetConfig: {
    gqlTagName: 'gql',
    fragmentMasking: false
  }
};

const config: CodegenConfig = {
  ignoreNoDocuments: true, // for better experience with the watcher
  generates: {
    './src/networks/common/graphqlApi/gql/': {
      schema: '../api/.checkpoint/schema.gql',
      documents: ['src/networks/common/graphqlApi/queries.ts'],
      ...baseConfig
    },
    './src/helpers/auction/gql/': {
      schema:
        'https://subgrapher.snapshot.org/subgraph/arbitrum/98f9T2v1KtNnZyexiEgNLMFnYkXdKoZq9Pt1EYQGq5aH',
      documents: ['src/helpers/auction/queries.ts'],
      ...baseConfig,
      config: {
        ...baseConfig.config,
        scalars: {
          BigInt: 'string',
          Bytes: 'string',
          BigDecimal: 'string'
        }
      }
    }
  }
};

export default config;
