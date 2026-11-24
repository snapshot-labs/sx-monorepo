import { API_URL } from '@/helpers/constants';
import { getChoiceText } from '@/helpers/utils';
import { Choice, Proposal } from '@/types';
import { GOVERNANCE_SPACES } from './config';
import { getFixtureVotes } from './fixtures';

/** Number of recent proposals (votes and polls) a record covers. */
export const RECORD_SIZE = 6;

/**
 * Snapshot hub for the `starknet.eth` poll space. Same URL as `HUB_URLS.s` in
 * `@/networks/offchain`, kept here because importing that module directly
 * creates a circular import.
 */
const HUB_URL = 'https://hub.snapshot.org/graphql';

/** The hub rejects `voter_in` lists that are too long. */
const HUB_BATCH_SIZE = 50;

export type RecordEntry = {
  proposal: Proposal;
  kind: 'Vote' | 'Poll';
  /** Choice label, or `null` if the address did not vote. */
  choice: string | null;
};

export type VotingRecord = {
  entries: RecordEntry[];
  cast: number;
  total: number;
};

type RawVote = { voter: string; proposal: string; choice: Choice };

const [VOTE_SPACE, POLL_SPACE] = GOVERNANCE_SPACES;

async function graphql<T>(
  url: string,
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables })
  });
  const body = await res.json();
  if (!res.ok || body.errors) {
    throw new Error(body.errors?.[0]?.message ?? `GraphQL ${res.status}`);
  }
  return body.data;
}

/** Most recent proposals across both spaces, newest first. */
export function pickRecentProposals(
  votes: Proposal[] = [],
  polls: Proposal[] = []
): Proposal[] {
  return [...votes, ...polls]
    .filter(proposal => proposal.state !== 'pending')
    .sort((a, b) => b.created - a.created)
    .slice(0, RECORD_SIZE);
}

function chunk<T>(items: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

async function loadOnchainVotes(voters: string[], proposalIds: string[]) {
  if (!voters.length || !proposalIds.length) return [];
  const data = await graphql<{
    votes: { voter: { id: string }; proposal: string; choice: Choice }[];
  }>(
    `${API_URL}/graphql`,
    `query ($space: String, $voters: [String], $proposals: [String]) {
      votes(
        indexer: "${VOTE_SPACE.network}"
        first: 1000
        where: { space: $space, voter_in: $voters, proposal_in: $proposals }
      ) {
        voter { id }
        proposal
        choice
      }
    }`,
    { space: VOTE_SPACE.id, voters, proposals: proposalIds }
  );
  return data.votes.map(vote => ({
    voter: vote.voter.id,
    proposal: vote.proposal,
    choice: vote.choice
  }));
}

async function loadOffchainVotes(voters: string[], proposalIds: string[]) {
  if (!voters.length || !proposalIds.length) return [];
  const batches = await Promise.all(
    chunk(voters, HUB_BATCH_SIZE).map(batch =>
      graphql<{
        votes: { voter: string; proposal: { id: string }; choice: Choice }[];
      }>(
        HUB_URL,
        `
          query ($voters: [String], $proposals: [String]) {
            votes(
              first: 1000
              where: { voter_in: $voters, proposal_in: $proposals }
            ) {
              voter
              proposal {
                id
              }
              choice
            }
          }
        `,
        { voters: batch, proposals: proposalIds }
      )
    )
  );
  return batches.flatMap(data =>
    data.votes.map(vote => ({
      voter: vote.voter,
      proposal: vote.proposal.id,
      choice: vote.choice
    }))
  );
}

/**
 * Voting records for `voters` on the given recent proposals. Addresses are
 * matched lowercased and zero-padded, as both indexers store them.
 */
export async function loadVotingRecords(
  voters: string[],
  proposals: Proposal[]
): Promise<Record<string, VotingRecord>> {
  const normalized = [...new Set(voters.map(v => v.toLowerCase()))];
  const onchain = proposals.filter(p => p.network === VOTE_SPACE.network);
  const offchain = proposals.filter(p => p.network === POLL_SPACE.network);

  const [onchainVotes, offchainVotes] = await Promise.all([
    loadOnchainVotes(
      normalized,
      onchain.map(p => p.proposal_id.toString())
    ),
    loadOffchainVotes(
      normalized,
      offchain.map(p => p.id)
    )
  ]);

  const byKey = new Map<string, RawVote>();
  const keyOf = (voter: string, network: string, proposalId: string) =>
    `${voter.toLowerCase()}|${network}|${proposalId}`;
  for (const vote of onchainVotes) {
    byKey.set(keyOf(vote.voter, VOTE_SPACE.network, vote.proposal), vote);
  }
  for (const vote of offchainVotes) {
    byKey.set(keyOf(vote.voter, POLL_SPACE.network, vote.proposal), vote);
  }

  const proposalKey = (p: Proposal) =>
    p.network === VOTE_SPACE.network ? p.proposal_id.toString() : p.id;

  return Object.fromEntries(
    normalized.map(voter => {
      const fixtureVotes = getFixtureVotes(voter);
      const entries = proposals.map((proposal, index) => {
        const vote = byKey.get(
          keyOf(voter, proposal.network, proposalKey(proposal))
        );
        const choice = vote?.choice ?? fixtureVotes?.[index] ?? null;
        return {
          proposal,
          kind:
            proposal.network === VOTE_SPACE.network
              ? VOTE_SPACE.kind
              : POLL_SPACE.kind,
          choice:
            choice === null ? null : getChoiceText(proposal.choices, choice)
        } satisfies RecordEntry;
      });
      return [
        voter,
        {
          entries,
          cast: entries.filter(entry => entry.choice !== null).length,
          total: entries.length
        }
      ];
    })
  );
}
