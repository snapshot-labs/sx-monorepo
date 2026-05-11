import { capture } from '@snapshot-labs/snapshot-sentry';
import snapshot from '@snapshot-labs/snapshot.js';
import { z } from 'zod';
import db from './mysql';
import { CB } from '../constants';

type Proposal = {
  id: string;
  type: string;
  scoresState: string;
  vpValueByStrategy: number[];
  scoresByStrategy: number[][];
};

const REFRESH_INTERVAL = 10 * 1000;
const BATCH_SIZE = 25;

const proposalSchema = z
  .object({
    id: z.string(),
    type: z.string(),
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
    SELECT id, type, scores_state, vp_value_by_strategy, scores_by_strategy
    FROM proposals
    WHERE cb = ? OR (cb = ? AND scores_state = 'final')
    ORDER BY created ASC
    LIMIT ?
  `;
  const proposals = await db.queryAsync(query, [
    CB.PENDING_COMPUTE,
    CB.PENDING_FINAL,
    BATCH_SIZE
  ]);

  return proposals.map((p: any) => ({
    id: p.id,
    type: p.type,
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

// For approval voting, scores_by_strategy counts a voter's VP once per approved choice,
// inflating scores_total_value. Instead, we sum vp_value directly from votes, which
// counts each voter's VP exactly once regardless of how many choices they approved.
async function getVotesVpValueSum(proposalId: string): Promise<number> {
  const [{ total }] = await db.queryAsync(
    'SELECT COALESCE(SUM(vp_value), 0) as total FROM votes WHERE proposal = ?',
    [proposalId]
  );

  return total;
}

// Both this job and votesVpValue trigger on cb = PENDING_COMPUTE, creating a race condition
// where this job could finalize the proposal before all votes have their vp_value computed.
// We check that all votes are in a terminal state (FINAL or INELIGIBLE) before allowing
// the proposal to transition to FINAL.
async function allVotesFinalized(proposalId: string): Promise<boolean> {
  const [{ pending }] = await db.queryAsync(
    'SELECT COUNT(*) as pending FROM votes WHERE proposal = ? AND cb NOT IN (?)',
    [proposalId, [CB.FINAL, CB.INELIGIBLE]]
  );

  return pending === 0;
}

async function refreshProposalsScoresTotalValue(proposals: Proposal[]) {
  const query: string[] = [];
  const params: any[] = [];

  for (const proposal of proposals) {
    query.push(
      'UPDATE proposals SET scores_total_value = ?, cb = ? WHERE id = ? LIMIT 1'
    );

    try {
      const scoresTotalValue =
        proposal.type === 'approval'
          ? await getVotesVpValueSum(proposal.id)
          : getScoresTotalValue(proposal);

      const canFinalize =
        proposal.scoresState === 'final' &&
        (await allVotesFinalized(proposal.id));
      const cb = canFinalize ? CB.FINAL : CB.PENDING_FINAL;

      params.push(scoresTotalValue, cb, proposal.id);
    } catch (err) {
      capture(err);
      params.push(0, CB.INELIGIBLE, proposal.id);
    }
  }

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
