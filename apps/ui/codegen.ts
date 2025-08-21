import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: [
    '../api/.checkpoint/schema.gql',
    'src/networks/common/graphqlApi/schema-augment.gql'
  ],
  documents: ['src/networks/common/graphqlApi/queries.ts'],
  ignoreNoDocuments: true, // for better experience with the watcher
  generates: {
    './src/networks/common/graphqlApi/gql/': {
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
    }
  }
};

export default config;
