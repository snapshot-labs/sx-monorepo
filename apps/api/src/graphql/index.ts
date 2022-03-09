import { graphqlHTTP } from 'express-graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import checkpoint from './checkpoint';
import proposals from './proposals';
import proposal from './proposal';
import votes from './votes';
import defaultQuery from './examples';
import typeDefs from './schema';

const rootValue = {
  Query: {
    checkpoint,
    proposals,
    proposal,
    votes
  }
};
const schema = makeExecutableSchema({ typeDefs, resolvers: rootValue });

export default graphqlHTTP({
  schema,
  rootValue,
  graphiql: { defaultQuery }
});
