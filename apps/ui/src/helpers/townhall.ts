import { ApolloClient, InMemoryCache } from '@apollo/client/core';
import gql from 'graphql-tag';
import { Statement, Vote } from '@/helpers/pulse';

type NewStatementEvent = [number, string, number, string];
type NewVoteEvent = [string, number, number, number];

const client = new ApolloClient({
  uri: 'http://localhost:3000',
  cache: new InMemoryCache({ addTypename: false })
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
      closed
      statements {
        id
        body
        author
        scores_1
        scores_2
        scores_3
        vote_count
        pinned
        hidden
        created
        discussion_id
        statement_id
        discussion {
          id
        }
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
      discussion_id
      statement_id
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

export function newStatementEventToEntry(event: NewStatementEvent): Statement {
  const [id, , discussion, body] = event;

  return {
    body,
    id: `${discussion}/${id}`,
    vote_count: 0,
    scores_1: 0,
    scores_2: 0,
    scores_3: 0,
    pinned: false,
    hidden: false,
    created: 0,
    discussion_id: discussion,
    statement_id: id,
    discussion: { id: discussion }
  };
}

export function newVoteEventToEntry(event: NewVoteEvent): Vote {
  const [voter, discussion, statement, choice] = event;

  return {
    id: `${discussion}/${statement}/${voter}`,
    created: 0,
    discussion_id: discussion,
    statement_id: statement,
    discussion: { id: discussion },
    statement: { id: statement },
    voter,
    choice
  };
}
