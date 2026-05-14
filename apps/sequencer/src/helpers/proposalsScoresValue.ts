import { capture } from '@snapshot-labs/snapshot-sentry';
import snapshot from '@snapshot-labs/snapshot.js';
import { z } from 'zod';
import db from './mysql';
import { CB } from '../constants';

type Proposal = {
  id: string;
  scoresState: string;
  vpValueByStrategy: number[];
  scoresByStrategy: number[][];
};

const REFRESH_INTERVAL = 10 * 1000;
const BATCH_SIZE = 25;

const proposalSchema = z
  .object({
    id: z.string(),
    scoresState: z.string(),
    vpValueByStrategy: z.array(z.number().finite()),
    scoresByStrategy: z.array(z.array(z.number().finite()))
  })
  .refine(
    data => {
      if (
        data.scoresByStrategy.length === 0 ||
        data.vpValueByStrategy.length === 0
      ) {
        return true;
      }
      // Ensure all scoresByStrategy arrays have the same length as vpValueByStrategy
      return data.scoresByStrategy.every(
        voteScores => voteScores.length === data.vpValueByStrategy.length
      );
    },
    {
      message:
        'Array size mismatch: voteScores length does not match vpValueByStrategy length'
    }
  );

async function getProposals(): Promise<Proposal[]> {
  const query = `
    SELECT id, scores_state, vp_value_by_strategy, scores_by_strategy
    FROM proposals
    WHERE cb = ?
    ORDER BY created ASC
    LIMIT ?
  `;
  const proposals = await db.queryAsync(query, [
    CB.PENDING_COMPUTE,
    BATCH_SIZE
  ]);

  return proposals.map((p: any) => ({
    id: p.id,
    scoresState: p.scores_state,
    vpValueByStrategy: JSON.parse(p.vp_value_by_strategy),
    scoresByStrategy: JSON.parse(p.scores_by_strategy)
  }));
}

export function getScoresTotalValue(proposal: Proposal): number {
  const { scoresByStrategy, vpValueByStrategy } =
    proposalSchema.parse(proposal);

  return vpValueByStrategy.reduce(
    (totalValue, strategyValue, strategyIndex) => {
      const strategyTotal = scoresByStrategy.reduce(
        (sum, voteScores) => sum + voteScores[strategyIndex],
        0
      );
      return totalValue + strategyTotal * strategyValue;
    },
    0
  );
}

async function refreshProposalsScoresTotalValue(proposals: Proposal[]) {
  const query: string[] = [];
  const params: any[] = [];

  proposals.forEach(proposal => {
    query.push(
      'UPDATE proposals SET scores_total_value = ?, cb = ? WHERE id = ? LIMIT 1'
    );

    try {
      const scoresTotalValue = getScoresTotalValue(proposal);
      params.push(
        scoresTotalValue,
        proposal.scoresState === 'final' ? CB.FINAL : CB.PENDING_FINAL,
        proposal.id
      );
    } catch (err) {
      capture(err);
      params.push(0, CB.INELIGIBLE, proposal.id);
    }
  });

  if (query.length) {
    await db.queryAsync(query.join(';'), params);
  }
}

export default async function run() {
  while (true) {
    const proposals = await getProposals();

    if (proposals.length) {
      await refreshProposalsScoresTotalValue(proposals);
    }

    if (proposals.length < BATCH_SIZE) {
      await snapshot.utils.sleep(REFRESH_INTERVAL);
    }
  }
}
