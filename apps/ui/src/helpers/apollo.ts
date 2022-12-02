import { ApolloClient, createHttpLink, InMemoryCache } from '@apollo/client/core';

// @ts-ignore
const httpLink = createHttpLink({ uri: import.meta.env.VITE_API_URL });

export default new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache({
    addTypename: false
  }),
  defaultOptions: {
    query: {
      fetchPolicy: 'no-cache'
    }
  }
});
