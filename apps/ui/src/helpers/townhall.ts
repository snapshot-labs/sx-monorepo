import { ApolloClient, InMemoryCache } from '@apollo/client/core';
import gql from 'graphql-tag';
import { Statement, Vote } from '@/helpers/pulse';

interface NewStatementEvent {
  id: number;
  author: string;
  discussion: number;
  body: string;
}

interface NewVoteEvent {
  voter: string;
  discussion: number;
  statement: number;
  choice: number;
}

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
  return {
    ...event,
    id: `${event.discussion}/${event.id}`,
    vote_count: 0,
    scores_1: 0,
    scores_2: 0,
    scores_3: 0,
    pinned: false,
    hidden: false,
    created: 0,
    discussion_id: event.discussion,
    statement_id: event.id,
    discussion: { id: event.discussion }
  };
}

export function newVoteEventToEntry(event: NewVoteEvent): Vote {
  return {
    ...event,
    id: `${event.discussion}/${event.statement}/${event.voter}`,
    created: 0,
    discussion_id: event.discussion,
    statement_id: event.statement,
    discussion: { id: event.discussion },
    statement: { id: event.statement }
  };
}
