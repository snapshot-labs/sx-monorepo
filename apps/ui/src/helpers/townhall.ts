import { ApolloClient, InMemoryCache } from '@apollo/client/core';
import gql from 'graphql-tag';

const client = new ApolloClient({
  uri: 'http://localhost:3000',
  cache: new InMemoryCache()
});

const DISCUSSION_QUERY = gql`
  query Discussion($id: String!) {
    discussion(id: $id) {
      id
      title
      body
      author
      statement_count
      vote_count
      created
      statements {
        id
        discussion {
          id
        }
        body
        author
        scores_1
        scores_2
        scores_3
        vote_count
        created
      }
    }
  }
`;

const VOTES_QUERY = gql`
  query Votes($discussion: String!, $voter: String!) {
    votes(where: { discussion: $discussion, voter: $voter }) {
      id
      voter
      choice
      created
      discussion {
        id
      }
      statement {
        id
      }
    }
  }
`;

export async function getDiscussion(id: string) {
  const { data } = await client.query({
    query: DISCUSSION_QUERY,
    variables: { id }
  });

  return data.discussion;
}

export async function getVotes(discussion: string, voter: string) {
  const { data } = await client.query({
    query: VOTES_QUERY,
    variables: { discussion, voter }
  });

  return data.votes;
}
