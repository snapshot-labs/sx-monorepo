import { RequestParamHandler } from 'express';
import { graphqlHTTP } from 'express-graphql';
import { GraphQLObjectType, GraphQLSchema } from 'graphql';

/**
 * Creates an graphql http handler for the query passed a parameters.
 * Returned middleware can be used with express.
 */
export default function get(query: GraphQLObjectType): RequestParamHandler {
  const schema = new GraphQLSchema({ query });
  return graphqlHTTP({ schema, graphiql: {} });
}
