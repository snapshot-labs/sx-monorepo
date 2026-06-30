import { CodegenConfig } from '@graphql-codegen/cli';

const baseConfig: CodegenConfig['config'] = {
  preset: 'client',
  config: {
    enumsAsTypes: true,
    skipTypename: true,
    avoidOptionals: {
      field: true,
      inputValue: false
    },
    scalars: {
      BigInt: 'string',
      Bytes: 'string',
      BigDecimal: 'string'
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
    './src/helpers/townhall/gql/': {
      schema: '../highlight/.checkpoint/schema.gql',
      documents: ['src/helpers/townhall/api.ts'],
      ...baseConfig
    }
  }
};

export default config;
