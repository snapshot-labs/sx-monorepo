import fs from 'fs';
import path from 'path';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { graphqlHTTP } from 'express-graphql';
import depthLimit from 'graphql-depth-limit';
import queryCountLimit from 'graphql-query-count-limit';
import defaultQuery from './examples';
import Query from './operations';
import { getHistoricalAccessContext } from '../helpers/historicalAccess';

const schemaFile = path.join(__dirname, './schema.gql');
const typeDefs = fs.readFileSync(schemaFile, 'utf8');
const rootValue = { Query };
const schema = makeExecutableSchema({ typeDefs, resolvers: rootValue });

export default graphqlHTTP((req, res) => ({
  schema,
  rootValue,
  context: {
    historicalAccess: getHistoricalAccessContext(req, res)
  },
  graphiql: { defaultQuery, headerEditorEnabled: true },
  validationRules: [queryCountLimit(5, 5), depthLimit(5)]
}));
