import { ApolloClient, InMemoryCache } from '@apollo/client/core';
import { HIGHLIGHT_URL } from '@/helpers/highlight';
import { Category, Post, Vote } from '@/helpers/townhall/types';
import { gql } from './gql';

type NewCategoryEvent = [number, number, string, string, number];
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
    owner
    vote_count
    topic_count
  }

  fragment categoryFields on Category {
    id
    category_id
    name
    slug
    description
    parent_category_id
    parent_category {
      category_id
      name
      slug
    }
    topic_count
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
    category {
      category_id
      name
      slug
    }
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
    isAdmin
  }
`);

const SPACE_QUERY = gql(`
  query Space($id: String!) {
    space(id: $id) {
      ...spaceFields
    }
  }
`);

const CATEGORY_QUERY = gql(`
  query Category($id: String!) {
    category(id: $id) {
      ...categoryFields
    }
  }
`);

const CATEGORIES_QUERY = gql(`
  query Categories($spaceId: String!, $parentCategoryId: Int!) {
    categories(where: { space: $spaceId, parent_category_id: $parentCategoryId }, orderBy: created, orderDirection: asc) {
      ...categoryFields
    }
  }
`);

const TOPICS_QUERY = gql(`
  query Topics($spaceId: String!, $categoryId: Int!, $limit: Int!, $skip: Int!) {
    topics(first: $limit, skip: $skip, orderBy: created, orderDirection: desc, where: { space: $spaceId, category_id: $categoryId }) {
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
          deleted
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

export async function getCategory({
  spaceId,
  categoryId
}: {
  spaceId: number;
  categoryId: number;
}) {
  const { data } = await client.query({
    query: CATEGORY_QUERY,
    variables: {
      id: `${spaceId}/${categoryId}`
    }
  });

  return data.category;
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
    variables: {
      spaceId: spaceId.toString(),
      parentCategoryId: parentCategoryId ?? 0
    }
  });

  return data.categories;
}

export async function getTopics({
  spaceId,
  categoryId,
  limit,
  skip
}: {
  spaceId: number;
  categoryId?: number | null;
  limit: number;
  skip: number;
}) {
  const { data } = await client.query({
    query: TOPICS_QUERY,
    variables: {
      spaceId: spaceId.toString(),
      categoryId: categoryId ?? 0,
      limit,
      skip
    }
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

  return (
    data.user?.roles.map(role => role.role).filter(role => !role.deleted) ?? []
  );
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
  const [spaceId, id, , , parentCategoryId] = event;

  return {
    id: `${spaceId}/${id}`,
    category_id: id,
    name: '',
    description: '',
    slug: '',
    parent_category_id: parentCategoryId,
    parent_category: parentCategoryId
      ? { category_id: parentCategoryId, name: '', slug: '' }
      : null,
    topic_count: 0
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
