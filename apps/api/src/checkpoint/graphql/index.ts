import { graphqlHTTP } from 'express-graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { toGql, toQuery } from './utils';

export default function get(types) {
  const rootValue = { Query: toQuery(types) };
  const typeDefs = toGql(types);
  const schema = makeExecutableSchema({ typeDefs, resolvers: rootValue });
  return graphqlHTTP({ schema, rootValue });
}
