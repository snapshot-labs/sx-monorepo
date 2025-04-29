import { IGraphQLConfig } from 'graphql-config';

const baseConfig = {
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

const configs: IGraphQLConfig = {
  projects: {
    api: {
      schema: '../api/.checkpoint/schema.gql',
      documents: ['src/networks/common/graphqlApi/queries.ts'],
      extensions: {
        codegen: {
          generates: {
            './src/networks/common/graphqlApi/gql/': baseConfig
          }
        }
      }
    },
    highlight: {
      schema: '../highlight/.checkpoint/schema.gql',
      documents: ['src/helpers/townhall/api.ts'],
      extensions: {
        codegen: {
          generates: {
            './src/helpers/townhall/gql/': baseConfig
          }
        }
      }
    }
  }
};

export default configs;
