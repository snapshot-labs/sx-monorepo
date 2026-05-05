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
    './src/helpers/auction/gql/': {
      schema:
        'https://subgrapher.snapshot.org/subgraph/arbitrum/6EcQPEFwfCiAq45qUKk4Wnajp5vCUFuxq4r5xSBiya1d',
      documents: ['src/helpers/auction/queries.ts'],
      ...baseConfig
    },
    './src/helpers/auction/referral/gql/': {
      schema: 'https://api.brokester.box',
      documents: ['src/helpers/auction/referral/queries.ts'],
      ...baseConfig
    }
  }
};

export default config;
