import { writeFile } from 'node:fs/promises';

const space = 'shutterdao0x36.eth';
const proposal =
  '0xff3507480f855f6512a909b67be0764f2116a2c7da4af022712bc2c8b74ace2c';

// Number of voting power requests run in parallel.
const CONCURRENCY = 8;

const OUTPUT_FILE = process.env.OUTPUT_FILE ?? 'scripts/autovote.json';
const SNAPSHOT_API_URL =
  process.env.SNAPSHOT_API_URL ?? 'https://hub.snapshot.org/graphql';
// Hub limits: 1000 items per page, 5000 on skip, 100 entries in an id_in.
const PAGE_SIZE = 1000;
const ID_IN_LIMIT = 100;
const MAX_RETRIES = 4;

type SpaceProposal = {
  id: string;
  title: string;
  body: string;
  author: string;
  discussion: string;
  type: string;
  choices: string[];
  created: number;
  start: number;
  end: number;
  state: string;
  votes: number;
  quorum: number;
  scores: number[];
  scores_total: number;
  scores_state: string;
};

// Delegate statement, the voter's own description of how they vote.
type Statement = {
  about: string;
  statement: string;
  discourse: string;
  status: string;
  created: number;
};

// Snapshot profile. Counts and lastVote are global, not scoped to the space.
type Profile = {
  name: string | null;
  about: string | null;
  avatar: string | null;
  twitter: string | null;
  github: string | null;
  farcaster: string | null;
  lens: string | null;
  created: number | null;
  votesCount: number;
  proposalsCount: number;
  lastVote: number;
};

// A vote cast in the space, the history an agent learns preferences from.
// Proposal details live in the top level proposals list, each vote only keeps
// the id to join on.
type UserVote = {
  created: number;
  choice: unknown;
  vp: number;
  reason: string;
  proposal: string;
};

type Voter = {
  address: string;
  vp: number;
  profile: Profile | null;
  statement: Statement | null;
  votes: UserVote[];
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const lower = (address: string) => address.toLowerCase();

async function gql<T>(
  query: string,
  variables?: Record<string, unknown>,
  attempt = 0
): Promise<T> {
  let res: Response;

  try {
    res = await fetch(SNAPSHOT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.SNAPSHOT_API_KEY && {
          'x-api-key': process.env.SNAPSHOT_API_KEY
        })
      },
      body: JSON.stringify({ query, variables })
    });
  } catch (err) {
    if (attempt >= MAX_RETRIES) throw err;
    await sleep(2 ** attempt * 1000);
    return gql<T>(query, variables, attempt + 1);
  }

  // Throttled or hub hiccup, back off and retry rather than lose the run.
  if (res.status === 429 || res.status >= 500) {
    if (attempt >= MAX_RETRIES) {
      throw new Error(`Hub answered ${res.status}, gave up after ${attempt}`);
    }

    const retryAfter = Number(res.headers.get('retry-after')) || 2 ** attempt;
    await sleep(retryAfter * 1000);
    return gql<T>(query, variables, attempt + 1);
  }

  const json = (await res.json()) as {
    data: T | null;
    errors?: { message: string }[];
  };

  // The hub answers 200 with a null field on partial errors, fail loudly
  // instead of silently returning nothing.
  if (!json.data || json.errors?.length) {
    throw new Error(json.errors?.[0]?.message ?? 'GraphQL returned no data');
  }

  return json.data;
}

// Walks a paginated hub collection until a partial page comes back.
async function paginate<T>(
  key: string,
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T[]> {
  const items: T[] = [];

  for (let skip = 0; ; skip += PAGE_SIZE) {
    const data = await gql<Record<string, T[]>>(query, {
      ...variables,
      first: PAGE_SIZE,
      skip
    });
    items.push(...(data[key] ?? []));

    if ((data[key] ?? []).length < PAGE_SIZE) return items;
  }
}

// Runs handler over every item, keeping at most CONCURRENCY requests in flight.
async function pool<T, R>(
  items: T[],
  handler: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await handler(items[index] as T, index);
      }
    })
  );

  return results;
}

const PROPOSAL_FIELDS = `
  id
  title
  body
  author
  discussion
  type
  choices
  created
  start
  end
  state
  votes
  quorum
  scores
  scores_total
  scores_state
`;

async function getProposal(): Promise<SpaceProposal> {
  const data = await gql<{
    proposal: (SpaceProposal & { space: { id: string } }) | null;
  }>(
    `query ($proposal: String!) {
      proposal(id: $proposal) {
        ${PROPOSAL_FIELDS}
        space {
          id
        }
      }
    }`,
    { proposal }
  );

  if (!data.proposal) throw new Error(`Proposal ${proposal} not found`);

  const { space: proposalSpace, ...target } = data.proposal;
  if (proposalSpace.id !== space) {
    throw new Error(`Proposal ${proposal} belongs to ${proposalSpace.id}`);
  }

  return target;
}

// Closed proposals only, the settled history an agent can learn from. Flagged
// (spam) proposals are left out.
async function getSpaceProposals(): Promise<SpaceProposal[]> {
  return paginate<SpaceProposal>(
    'proposals',
    `query ($space: String!, $first: Int!, $skip: Int!) {
      proposals(
        first: $first
        skip: $skip
        orderBy: "created"
        orderDirection: desc
        where: {
          space: $space
          votes_gt: 0
          flagged: false
          state: "closed"
        }
      ) { ${PROPOSAL_FIELDS} }
    }`,
    { space }
  );
}

async function getStatements(): Promise<Record<string, Statement>> {
  const statements = await paginate<Statement & { delegate: string }>(
    'statements',
    `query ($space: String!, $first: Int!, $skip: Int!) {
      statements(first: $first, skip: $skip, where: { space: $space }) {
        delegate
        about
        statement
        discourse
        status
        created
      }
    }`,
    { space }
  );

  return Object.fromEntries(
    statements.map(({ delegate, ...statement }) => [lower(delegate), statement])
  );
}

async function getProfiles(
  addresses: string[]
): Promise<Record<string, Profile>> {
  const batches = Array.from(
    { length: Math.ceil(addresses.length / ID_IN_LIMIT) },
    (_, i) => addresses.slice(i * ID_IN_LIMIT, (i + 1) * ID_IN_LIMIT)
  );

  const users = await pool(batches, batch =>
    paginate<Profile & { id: string }>(
      'users',
      `query ($addresses: [String], $first: Int!, $skip: Int!) {
        users(first: $first, skip: $skip, where: { id_in: $addresses }) {
          id
          name
          about
          avatar
          twitter
          github
          farcaster
          lens
          created
          votesCount
          proposalsCount
          lastVote
        }
      }`,
      { addresses: batch }
    )
  );

  return Object.fromEntries(
    users.flat().map(({ id, ...profile }) => [lower(id), profile])
  );
}

// Every vote cast in the space, in one sweep rather than one query per voter.
// Cursor paginated on `created` because the hub refuses a skip above 5000, and
// deduped by id since a page boundary can land inside a single timestamp.
async function getSpaceVotes(): Promise<(UserVote & { voter: string })[]> {
  const votes: (UserVote & { voter: string })[] = [];
  const seen = new Set<string>();
  let created: number | undefined;

  for (;;) {
    const data = await gql<{
      votes: (Omit<UserVote, 'proposal'> & {
        id: string;
        voter: string;
        proposal: { id: string };
      })[];
    }>(
      `query ($space: String!, $created: Int, $first: Int!) {
        votes(
          first: $first
          orderBy: "created"
          orderDirection: desc
          where: { space: $space, created_lte: $created }
        ) {
          id
          voter
          created
          choice
          vp
          reason
          proposal {
            id
          }
        }
      }`,
      { space, created, first: PAGE_SIZE }
    );

    const fresh = data.votes.filter(vote => !seen.has(vote.id));
    for (const { id, proposal: votedOn, ...vote } of fresh) {
      seen.add(id);
      votes.push({ ...vote, proposal: votedOn.id });
    }

    // A full page of duplicates would mean 1000 votes share one timestamp,
    // stop rather than loop forever on the same cursor.
    if (data.votes.length < PAGE_SIZE || !fresh.length) return votes;

    created = data.votes[data.votes.length - 1]?.created;
  }
}

async function getVotingPower(voter: string): Promise<number> {
  const data = await gql<{ vp: { vp: number } | null }>(
    `query ($voter: String!, $space: String!, $proposal: String) {
      vp(voter: $voter, space: $space, proposal: $proposal) {
        vp
      }
    }`,
    { voter, space, proposal }
  );

  return data.vp?.vp ?? 0;
}

async function run() {
  console.log(`Loading ${space}...`);
  const target = await getProposal();

  const [proposals, statements, spaceVotes] = await Promise.all([
    getSpaceProposals(),
    getStatements(),
    getSpaceVotes()
  ]);

  // Keep every address that ever voted, but only the votes cast on proposals
  // that made the cut, so no vote points at a proposal we dropped.
  const addresses = Array.from(
    new Map(spaceVotes.map(vote => [lower(vote.voter), vote.voter])).values()
  );
  const kept = new Set(proposals.map(p => p.id));
  const history: Record<string, UserVote[]> = {};
  for (const { voter, ...vote } of spaceVotes) {
    if (kept.has(vote.proposal)) (history[lower(voter)] ??= []).push(vote);
  }

  const profiles = await getProfiles(addresses);
  console.log(
    `Found ${addresses.length} unique voters, ${proposals.length} closed proposals, ` +
      `${Object.keys(statements).length} statements, ${Object.keys(profiles).length} profiles\n`
  );

  console.log(`Loading voting power on ${proposal}...`);
  const powers = await pool(addresses, async (address, index) => {
    const vp = await getVotingPower(address);
    console.log(`[${index + 1}/${addresses.length}] ${address} ${vp}`);
    return vp;
  });

  const voters: Voter[] = addresses
    .map((address, index) => ({
      address,
      vp: powers[index] ?? 0,
      profile: profiles[lower(address)] ?? null,
      statement: statements[lower(address)] ?? null,
      votes: history[lower(address)] ?? []
    }))
    .filter(voter => voter.vp > 0)
    .sort((a, b) => b.vp - a.vp);

  const dataset = { space, proposal: target, proposals, voters };
  await writeFile(OUTPUT_FILE, JSON.stringify(dataset, null, 2));

  console.log(`\nClosed proposals: ${proposals.length}`);
  console.log(
    `Addresses with voting power: ${voters.length}/${addresses.length}`
  );
  console.log(`Voters with a profile: ${voters.filter(v => v.profile).length}`);
  console.log(
    `Voters with a statement: ${voters.filter(v => v.statement).length}`
  );
  console.log(
    `Votes loaded: ${voters.reduce((total, v) => total + v.votes.length, 0)}`
  );
  console.log(`Saved to ${OUTPUT_FILE}`);

  return dataset;
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
