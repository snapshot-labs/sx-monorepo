import { capture } from '@snapshot-labs/snapshot-sentry';
import snapshot from '@snapshot-labs/snapshot.js';
import { z } from 'zod';
import log from './log';
import db from './mysql';
import { addPoints } from './points';
import { CB } from '../constants';

type ProposalVpValues = Map<
  string,
  { cb: number; vpValueByStrategy: number[] }
>;

type Datum = {
  id: string;
  voter: string;
  space: string;
  proposal: string;
  created: number;
  vpState: string;
  vpByStrategy: number[];
  vpValueByStrategy: number[];
  proposalCb: number;
};

const REFRESH_INTERVAL = 60 * 1000;
const DEFAULT_BATCH_SIZE = 500;
const PROPOSALS_BATCH_SIZE = 50000;

const datumSchema = z
  .object({
    id: z.string(),
    voter: z.string(),
    space: z.string(),
    vpState: z.string(),
    vpValueByStrategy: z.array(z.number().finite()),
    vpByStrategy: z.array(z.number().finite())
  })
  .refine(data => data.vpValueByStrategy.length === data.vpByStrategy.length, {
    message:
      'Array length mismatch: vpValueByStrategy and vpByStrategy must have the same length'
  });

async function getPendingVotes(): Promise<
  {
    id: string;
    voter: string;
    space: string;
    proposal: string;
    created: number;
    vpState: string;
    vpByStrategy: number[];
  }[]
> {
  const query = `
    SELECT id, voter, space, proposal, created, vp_state, vp_by_strategy
    FROM votes
    WHERE cb = ?
    LIMIT ?`;
  const results = await db.queryAsync(query, [
    CB.PENDING_COMPUTE,
    DEFAULT_BATCH_SIZE
  ]);

  return results.map((r: any) => ({
    id: r.id,
    voter: r.voter,
    space: r.space,
    proposal: r.proposal,
    created: r.created,
    vpState: r.vp_state,
    vpByStrategy: JSON.parse(r.vp_by_strategy)
  }));
}

async function getProposalVpValues(): Promise<ProposalVpValues> {
  const map: ProposalVpValues = new Map();
  let lastId = '';

  while (true) {
    const query = `
      SELECT id, cb, vp_value_by_strategy
      FROM proposals
      WHERE cb IN (?) AND votes > 0 AND id > ?
      ORDER BY id
      LIMIT ?`;
    const results = await db.queryAsync(query, [
      [CB.PENDING_COMPUTE, CB.PENDING_FINAL, CB.FINAL, CB.INELIGIBLE],
      lastId,
      PROPOSALS_BATCH_SIZE
    ]);

    if (results.length === 0) break;

    for (const r of results) {
      map.set(r.id, {
        cb: r.cb,
        vpValueByStrategy:
          r.cb === CB.INELIGIBLE ? [] : JSON.parse(r.vp_value_by_strategy)
      });
    }

    lastId = results[results.length - 1].id;

    if (results.length < PROPOSALS_BATCH_SIZE) break;
  }

  return map;
}

async function refreshVotesVpValues(data: Datum[]) {
  if (!data.length) return;

  const ids: string[] = [];
  const vpValues: Map<string, number> = new Map();
  const cbValues: Map<string, number> = new Map();
  const leaderboardPairs: Set<string> = new Set();
  const pointsEntries: Parameters<typeof addPoints>[0][] = [];

  for (const datum of data) {
    if (datum.proposalCb === CB.INELIGIBLE) {
      ids.push(datum.id);
      vpValues.set(datum.id, 0);
      cbValues.set(datum.id, CB.INELIGIBLE);
      continue;
    }

    try {
      const validatedDatum = datumSchema.parse(datum);
      const value = validatedDatum.vpValueByStrategy.reduce(
        (sum, value, index) => sum + value * validatedDatum.vpByStrategy[index],
        0
      );

      ids.push(validatedDatum.id);
      vpValues.set(validatedDatum.id, value);
      cbValues.set(
        validatedDatum.id,
        validatedDatum.vpState === 'final' ? CB.FINAL : CB.PENDING_FINAL
      );

      if (validatedDatum.vpState === 'final') {
        pointsEntries.push({
          user: validatedDatum.voter,
          action: 'proposal/vote',
          ref: datum.proposal,
          amount: value,
          created: datum.created
        });
      }

      leaderboardPairs.add(`${validatedDatum.voter}:${validatedDatum.space}`);
    } catch (err) {
      capture(err);
      ids.push(datum.id);
      vpValues.set(datum.id, 0);
      cbValues.set(datum.id, CB.INELIGIBLE);
    }
  }

  if (!ids.length) return;

  // Awarded before votes are marked FINAL: a failure here leaves the batch in
  // cb pending, so it retries next cycle; addPoints dedups on retry
  for (const entry of pointsEntries) {
    await addPoints(entry);
  }

  const vpCases = ids.map(() => 'WHEN id = ? THEN ?').join(' ');
  const cbCases = ids.map(() => 'WHEN id = ? THEN ?').join(' ');
  const placeholders = ids.map(() => '?').join(',');

  const vpParams: (number | string)[] = [];
  const cbParams: (number | string)[] = [];

  for (const id of ids) {
    vpParams.push(id, vpValues.get(id)!);
    cbParams.push(id, cbValues.get(id)!);
  }

  const queries: string[] = [
    `UPDATE votes SET vp_value = CASE ${vpCases} END, cb = CASE ${cbCases} END WHERE id IN (${placeholders}) AND cb = ?`
  ];
  const params: (number | string)[] = [
    ...vpParams,
    ...cbParams,
    ...ids,
    CB.PENDING_COMPUTE
  ];

  // Refresh leaderboard vp_value using SUM from votes table (idempotent)
  if (leaderboardPairs.size) {
    const pairPlaceholders = Array.from(leaderboardPairs)
      .map(() => '(?, ?)')
      .join(', ');
    queries.push(
      `UPDATE leaderboard l
        SET vp_value = COALESCE((
          SELECT SUM(v.vp_value) FROM votes v WHERE v.voter = l.user AND v.space = l.space
        ), 0)
        WHERE (l.user, l.space) IN (${pairPlaceholders})`
    );
    for (const pair of leaderboardPairs) {
      const [voter, space] = pair.split(':');
      params.push(voter, space);
    }
  }

  await db.queryAsync(queries.join(';'), params);
}

async function processBatch(
  proposalVpValues: ProposalVpValues
): Promise<number> {
  const votes = await getPendingVotes();
  if (!votes.length) return 0;

  const data: Datum[] = votes
    .filter(v => proposalVpValues.has(v.proposal))
    .map(v => {
      const proposal = proposalVpValues.get(v.proposal)!;
      return {
        id: v.id,
        voter: v.voter,
        space: v.space,
        proposal: v.proposal,
        created: v.created,
        vpState: v.vpState,
        vpByStrategy: v.vpByStrategy,
        vpValueByStrategy: proposal.vpValueByStrategy,
        proposalCb: proposal.cb
      };
    });

  await refreshVotesVpValues(data);

  return votes.length;
}

// Ignored/filtered out votes still count as processed
async function processAllBatches(
  proposalVpValues: ProposalVpValues
): Promise<number> {
  let totalProcessed = 0;
  let processed = DEFAULT_BATCH_SIZE;

  while (processed === DEFAULT_BATCH_SIZE) {
    processed = await processBatch(proposalVpValues);
    totalProcessed += processed;
  }

  return totalProcessed;
}

export default async function run() {
  while (true) {
    log.info('[votesVpValue] Start refresh');

    const proposalVpValues = await getProposalVpValues();
    log.info(`[votesVpValue] Found ${proposalVpValues.size} proposals`);

    const totalProcessed = await processAllBatches(proposalVpValues);

    log.info(`[votesVpValue] ${totalProcessed} votes processed, sleeping`);
    await snapshot.utils.sleep(REFRESH_INTERVAL);
  }
}
