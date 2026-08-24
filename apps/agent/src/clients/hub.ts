import { HUB_URL, SUPPORTED_TYPES } from '../config';

export type Proposal = {
  id: string;
  space: { id: string };
  title: string;
  type: string;
  privacy: string;
  choices: string[];
  end: number;
};

type GraphqlResponse<T> = {
  data: T | null;
  errors?: { message: string }[];
};

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
        id
        space {
          id
        }
        title
        type
        privacy
        choices
        end
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
