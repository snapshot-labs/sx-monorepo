import { graphqlHTTP } from 'express-graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import votes from './votes';
import defaultQuery from './examples';
import typeDefs from './schema';

const rootValue = {
  Query: {
    votes
  }
};
const schema = makeExecutableSchema({ typeDefs, resolvers: rootValue });

export default graphqlHTTP({
  schema,
  rootValue,
  graphiql: { defaultQuery }
});
