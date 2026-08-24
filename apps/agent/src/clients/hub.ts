import { HUB_URL, SUPPORTED_TYPES } from '../config';

export type Proposal = {
  id: string;
  space: { id: string };
  title: string;
  body: string;
  type: string;
  privacy: string;
  choices: string[];
  end: number;
};

type GraphqlResponse<T> = {
  data: T | null;
  errors?: { message: string }[];
};

const ID_CHUNK_SIZE = 50;

const ALIAS_PERIOD = 90 * 24 * 60 * 60;

const PROPOSAL_FIELDS = `
  id
  space {
    id
  }
  title
  body
  type
  privacy
  choices
  end
`;

/**
 * The hub answers 200 with a null field on partial errors, so anything in
 * `errors` has to throw rather than surface as an empty result.
 */
async function gql<T>(
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  const res = await fetch(HUB_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  });

  const json = (await res.json()) as GraphqlResponse<T>;
  if (json.errors?.length || !json.data) {
    throw new Error(json.errors?.[0]?.message ?? 'hub returned no data');
  }

  return json.data;
}

export async function getActiveProposals(
  spaces: string[]
): Promise<Proposal[]> {
  const { proposals } = await gql<{ proposals: Proposal[] }>(
    `query ActiveProposals($spaces: [String]!, $types: [String]!) {
      proposals(
        first: 100
        where: {
          space_in: $spaces
          state: "active"
          type_in: $types
          flagged: false
        }
        orderBy: "created"
        orderDirection: desc
      ) {
        ${PROPOSAL_FIELDS}
      }
    }`,
    { spaces, types: SUPPORTED_TYPES }
  );

  return proposals;
}

export async function getOptedInVoters(
  agentAddress: string
): Promise<string[]> {
  const { aliases } = await gql<{ aliases: { address: string }[] }>(
    `query OptedInVoters($alias: String!) {
      aliases(first: 1000, where: { alias: $alias }) {
        address
      }
    }`,
    { alias: agentAddress }
  );

  return aliases.map(alias => alias.address);
}

export async function getVotersWhoVoted(
  proposal: string,
  voters: string[]
): Promise<string[]> {
  if (!voters.length) return [];

  const { votes } = await gql<{ votes: { voter: string }[] }>(
    `query ExistingVotes($proposal: String!, $voters: [String]!) {
      votes(first: 1000, where: { proposal: $proposal, voter_in: $voters }) {
        voter
      }
    }`,
    { proposal, voters }
  );

  return votes.map(vote => vote.voter);
}

export async function getProposals(ids: string[]): Promise<Proposal[]> {
  const proposals: Proposal[] = [];

  for (let i = 0; i < ids.length; i += ID_CHUNK_SIZE) {
    const chunk = ids.slice(i, i + ID_CHUNK_SIZE);
    const { proposals: page } = await gql<{ proposals: Proposal[] }>(
      `query Proposals($ids: [String]!) {
        proposals(first: ${ID_CHUNK_SIZE}, where: { id_in: $ids }) {
          ${PROPOSAL_FIELDS}
        }
      }`,
      { ids: chunk }
    );

    proposals.push(...page);
  }

  return proposals;
}

export async function getAliasOwner(
  alias: string
): Promise<string | undefined> {
  const createdGt = Math.floor(Date.now() / 1000) - ALIAS_PERIOD;

  const { aliases } = await gql<{ aliases: { address: string }[] }>(
    `query AliasOwner($alias: String!, $createdGt: Int!) {
      aliases(first: 1, where: { alias: $alias, created_gt: $createdGt }) {
        address
      }
    }`,
    { alias, createdGt }
  );

  return aliases[0]?.address;
}
