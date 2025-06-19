import { ApolloClient, InMemoryCache } from '@apollo/client/core';
import { HIGHLIGHT_URL } from '@/helpers/highlight';
import { Category, Post, Vote } from '@/helpers/townhall/types';
import { gql } from './gql';

type NewCategoryEvent = [number, number, string, string, string, number];
type NewPostEvent = [string, number, number, string, string];
type NewVoteEvent = [string, number, number, string, number];

export type Result = {
  post_id: number;
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
    space_id
    vote_count
    topic_count
  }

  fragment categoryFields on Category {
    id
    category_id
    name
    description
  }

  fragment postFields on Post {
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
    topic_id
    post_id
    topic {
      id
    }
  }

  fragment topicFields on Topic {
    id
    title
    body
    discussion_url
    author
    post_count
    vote_count
    created
    closed
    topic_id
    posts {
      ...postFields
    }
  }

  fragment voteFields on Vote {
    id
    voter
    choice
    created
    topic_id
    post_id
    topic {
      id
    }
    post {
      id
    }
  }

  fragment roleFields on Role {
    id
    space {
      id
      space_id
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

const CATEGORIES_QUERY = gql(`
  query Categories($spaceId: String!, $parentCategoryId: Int) {
    categories(where: { space: $spaceId, parent_category_id: $parentCategoryId }, orderBy: created, orderDirection: asc) {
      ...categoryFields
    }
  }
`);

const TOPICS_QUERY = gql(`
  query Topics($spaceId: String!, $limit: Int!, $skip: Int!) {
    topics(first: $limit, skip: $skip, orderBy: created, orderDirection: desc, where: { space: $spaceId }) {
      ...topicFields
    }
  }
`);

const TOPIC_QUERY = gql(`
  query Topic($id: String!) {
    topic(id: $id) {
      ...topicFields
    }
  }
`);

const VOTES_QUERY = gql(`
  query Votes($topic: String!, $voter: String!) {
    votes(where: { topic: $topic, voter: $voter }) {
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

export async function getSpace(spaceId: number) {
  const { data } = await client.query({
    query: SPACE_QUERY,
    variables: { id: spaceId.toString() }
  });

  return data.space;
}

export async function getCategories({
  spaceId,
  parentCategoryId
}: {
  spaceId: number;
  parentCategoryId: number | null;
}) {
  const { data } = await client.query({
    query: CATEGORIES_QUERY,
    variables: { spaceId: spaceId.toString(), parentCategoryId }
  });

  return data.categories;
}

export async function getTopics({
  spaceId,
  limit,
  skip
}: {
  spaceId: number;
  limit: number;
  skip: number;
}) {
  const { data } = await client.query({
    query: TOPICS_QUERY,
    variables: { spaceId: spaceId.toString(), limit, skip }
  });

  return data.topics;
}

export async function getTopic(spaceId: number, topicId: number) {
  const { data } = await client.query({
    query: TOPIC_QUERY,
    variables: { id: `${spaceId}/${topicId}` }
  });

  return data.topic;
}

export async function getVotes(
  spaceId: number,
  topicId: number,
  voter: string
) {
  const { data } = await client.query({
    query: VOTES_QUERY,
    variables: { topic: `${spaceId}/${topicId}`, voter }
  });

  return data.votes;
}

export async function getRoles(spaceId: number) {
  const { data } = await client.query({
    query: ROLES_QUERY,
    variables: { space: spaceId.toString() }
  });

  return data.roles;
}

export async function getUserRoles(spaceId: number, user: string) {
  const { data } = await client.query({
    query: USER_ROLES_QUERY,
    variables: { user: `${spaceId}/${user}` }
  });

  return data.user?.roles.map(role => role.role) ?? [];
}

export async function getResultsByRole(
  spaceId: number,
  topicId: number,
  roleId: string
): Promise<Result[]> {
  const res = await fetch(
    `${HIGHLIGHT_URL}/townhall/spaces/${spaceId}/topics/${topicId}/results_by_role/${roleId}`
  );

  const { error, result } = await res.json();
  if (error) throw new Error('RPC call failed');

  return result.map(r => ({
    ...r,
    vote_count: Number(r.vote_count)
  }));
}

export function newCategoryEventToEntry(event: NewCategoryEvent): Category {
  const [spaceId, id, , name, description] = event;

  return {
    id: `${spaceId}/${id}`,
    category_id: id,
    name,
    description
  };
}

export function newPostEventToEntry(event: NewPostEvent): Post {
  const [, topicId, id, author, body] = event;

  return {
    id: `${topicId}/${id}`,
    author,
    body,
    vote_count: 0,
    scores_1: 0,
    scores_2: 0,
    scores_3: 0,
    pinned: false,
    hidden: false,
    created: Math.floor(Date.now() / 1000),
    topic_id: topicId,
    post_id: id,
    topic: { id: String(topicId) }
  };
}

export function newVoteEventToEntry(event: NewVoteEvent): Vote {
  const [, topicId, postId, voter, choice] = event;

  return {
    id: `${topicId}/${postId}/${voter}`,
    created: Math.floor(Date.now() / 1000),
    topic_id: topicId,
    post_id: postId,
    topic: { id: String(topicId) },
    post: { id: String(postId) },
    voter,
    choice
  };
}
