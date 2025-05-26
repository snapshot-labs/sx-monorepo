import { ApolloClient, InMemoryCache } from '@apollo/client/core';
import { HIGHLIGHT_URL } from '@/helpers/highlight';
import { Statement, Vote } from '@/helpers/townhall/types';
import { gql } from './gql';

type NewStatementEvent = [number, string, number, string];
type NewVoteEvent = [string, number, number, number];

export type Result = {
  statement_id: number;
  choice: number;
  vote_count: number;
};

const client = new ApolloClient({
  uri: HIGHLIGHT_URL,
  cache: new InMemoryCache({ addTypename: false }),
  defaultOptions: {
    query: {
      fetchPolicy: 'no-cache'
    }
  }
});

gql(`
  fragment spaceFields on Space {
    id
    vote_count
    discussion_count
  }

  fragment statementFields on Statement {
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

  fragment discussionFields on Discussion {
    id
    title
    body
    discussion_url
    author
    statement_count
    vote_count
    created
    closed
    statements {
      ...statementFields
    }
  }

  fragment voteFields on Vote {
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

  fragment roleFields on Role {
    id
    space {
      id
    }
    name
    description
    color
  }
`);

const SPACE_QUERY = gql(`
  query Space($id: String!) {
    space(id: $id) {
      ...spaceFields
    }
  }
`);

const DISCUSSIONS_QUERY = gql(`
  query Discussions($limit: Int!, $skip: Int!) {
    discussions(first: $limit, skip: $skip, orderBy: created, orderDirection: desc) {
      ...discussionFields
    }
  }
`);

const DISCUSSION_QUERY = gql(`
  query Discussion($id: String!) {
    discussion(id: $id) {
      ...discussionFields
    }
  }
`);

const VOTES_QUERY = gql(`
  query Votes($discussion: String!, $voter: String!) {
    votes(where: { discussion: $discussion, voter: $voter }) {
      ...voteFields
    }
  }
`);

const ROLES_QUERY = gql(`
  query Roles($space: String!) {
    roles(where: { space: $space, deleted: false }, orderBy: id, orderDirection: asc) {
      ...roleFields
    }
  }
`);

const USER_ROLES_QUERY = gql(`
  query UserRoles($user: String!) {
    user(id: $user) {
      roles {
        role {
          ...roleFields
        }
      }
    }
  }
`);

const CATEGORIES_QUERY = gql(`
  query Categories {
    categories(orderBy: created, orderDirection: desc) {
      id
      parent_id
      name
      about
      created
    }
  }
`);

export async function getSpace(spaceId: string) {
  const { data } = await client.query({
    query: SPACE_QUERY,
    variables: { id: spaceId }
  });

  return data.space;
}

export async function getDiscussions({
  limit,
  skip
}: {
  limit: number;
  skip: number;
}) {
  const { data } = await client.query({
    query: DISCUSSIONS_QUERY,
    variables: { limit, skip }
  });

  return data.discussions;
}

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

export async function getRoles(spaceId: string) {
  const { data } = await client.query({
    query: ROLES_QUERY,
    variables: { space: spaceId }
  });

  return data.roles;
}

export async function getCategories() {
  const { data } = await client.query({
    query: CATEGORIES_QUERY
  });

  return data.categories;
}

export async function getUserRoles(user: string) {
  const { data } = await client.query({
    query: USER_ROLES_QUERY,
    variables: { user }
  });

  return data.user?.roles.map(role => role.role) ?? [];
}

export async function getResultsByRole(
  discussionId: number,
  roleId: string
): Promise<Result[]> {
  const res = await fetch(
    `${HIGHLIGHT_URL}/townhall/discussions/${discussionId}/results_by_role/${roleId}`
  );

  const { error, result } = await res.json();
  if (error) throw new Error('RPC call failed');

  return result.map(r => ({
    ...r,
    vote_count: Number(r.vote_count)
  }));
}

export function newStatementEventToEntry(event: NewStatementEvent): Statement {
  const [id, author, discussion, body] = event;

  return {
    id: `${discussion}/${id}`,
    author,
    body,
    vote_count: 0,
    scores_1: 0,
    scores_2: 0,
    scores_3: 0,
    pinned: false,
    hidden: false,
    created: 0,
    discussion_id: discussion,
    statement_id: id,
    discussion: { id: String(discussion) }
  };
}

export function newVoteEventToEntry(event: NewVoteEvent): Vote {
  const [voter, discussion, statement, choice] = event;

  return {
    id: `${discussion}/${statement}/${voter}`,
    created: 0,
    discussion_id: discussion,
    statement_id: statement,
    discussion: { id: String(discussion) },
    statement: { id: String(statement) },
    voter,
    choice
  };
}
